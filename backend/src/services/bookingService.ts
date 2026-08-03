import mongoose, { Types } from "mongoose";
import BookingModel, { IBooking, IBookingItem } from "../models/bookingModel";
import SeatMapModel from "../models/seatMapModel";
import { eventModel } from "../models/eventModel";
import { httpError } from "../utils/httpError";

const HOLD_MS = 10 * 60 * 1000; 

export interface CreateBookingDTO {
  eventId: string;
  seats: Array<{ x: number; y: number }>;
}

export const createBookingFromSelection = async (
  userId: string,
  dto: CreateBookingDTO
): Promise<IBooking> => {
  if (!Types.ObjectId.isValid(dto.eventId)) {
    const e = new Error("Invalid event ID");
    // @ts-ignore
    e.status = 400;
    throw e;
  }

  const event = await eventModel.findById(dto.eventId).lean().exec();
  if (!event || event.status !== "published") {
    const e = new Error("Event not found or not published");
    // @ts-ignore
    e.status = 404;
    throw e;
  }

  // De-dup & validate seats
  const seatMap = new Map<string, { x: number; y: number }>();
  for (const s of dto.seats || []) {
    if (
      !s ||
      typeof s.x !== "number" ||
      typeof s.y !== "number" ||
      !Number.isFinite(s.x) ||
      !Number.isFinite(s.y)
    ) {
      const e = new Error("Invalid seat coordinates");
      // @ts-ignore
      e.status = 400;
      throw e;
    }
    seatMap.set(`${s.x},${s.y}`, { x: s.x, y: s.y });
  }
  const seats = Array.from(seatMap.values());
  if (seats.length === 0) {
    const e = new Error("No seats provided");
    // @ts-ignore
    e.status = 400;
    throw e;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + HOLD_MS);

  const eventOid = new Types.ObjectId(dto.eventId);
  const userOid = new Types.ObjectId(userId);

  // Same-user idempotency/overlap guard
  const seatOr = seats.map((s) => ({
    "items.seatCoords.x": s.x,
    "items.seatCoords.y": s.y,
  }));
  const overlapping = await BookingModel.findOne({
    userId: userOid,
    eventId: eventOid,
    status: "unpaid",
    expiresAt: { $gt: now },
    $or: seatOr,
  })
    .lean()
    .exec();

  if (overlapping) {
    const e = new Error(
      "You already hold one or more of these seats. Complete payment or wait for the hold to expire."
    );
    // @ts-ignore
    e.status = 409;
    throw e;
  }

  const session = await mongoose.startSession();
  try {
    let booking!: IBooking;

    await session.withTransaction(async () => {
      const items: IBookingItem[] = [];
      const failed: Array<{ x: number; y: number }> = [];

      for (const { x, y } of seats) {
        // Atomic claim (only if available OR reserved but expired)
        const updatedDoc = await SeatMapModel.findOneAndUpdate(
          {
            eventId: eventOid,
            seats: {
              $elemMatch: {
                x,
                y,
                $or: [
                  { status: "available" },
                  { status: "reserved", reservedUntil: { $lt: now } },
                ],
              },
            },
          },
          {
            $set: {
              "seats.$.status": "reserved",
              "seats.$.reservedBy": userOid,
              "seats.$.reservedUntil": expiresAt,
            },
          },
          { new: false, session }
        )
          .lean()
          .exec();

        if (!updatedDoc) {
          failed.push({ x, y });
          continue;
        }

        // Read price
        const seatDoc = await SeatMapModel.findOne(
          { eventId: eventOid },
          { seats: { $elemMatch: { x, y } } }
        )
          .session(session)
          .lean();

        const seat = seatDoc?.seats?.[0];
        if (!seat) {
          failed.push({ x, y });
          continue;
        }

        items.push({ seatCoords: { x, y }, price: seat.price });
      }

      if (failed.length > 0) {
        const list = failed.map((s) => `(${s.x},${s.y})`).join(", ");
        const e = new Error(`These seats are no longer available: ${list}`);
        // @ts-ignore
        e.status = 409;
        throw e; 
      }

      const total = items.reduce((sum, i) => sum + i.price, 0);

      const [created] = await BookingModel.create(
        [
          {
            userId: userOid,
            eventId: eventOid,
            items,
            total,
            status: "unpaid",
            expiresAt,
          },
        ],
        { session }
      );

      booking = created;
    });

    return booking;
  } finally {
    session.endSession();
  }
};

export const getMyBookings = async (userId: string) => {
  return BookingModel.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean()
    .exec();
};

export const cancelBooking = async (userId: string, bookingId: string) => {
  if (!Types.ObjectId.isValid(bookingId)) {
    const e = new Error("Invalid booking ID");
    // @ts-ignore
    e.status = 400;
    throw e;
  }

  const booking = await BookingModel.findOne({
    _id: new Types.ObjectId(bookingId),
    userId: new Types.ObjectId(userId),
  }).lean();

  if (!booking) {
    const e = new Error("Booking not found");
    // @ts-ignore
    e.status = 404;
    throw e;
  }
  if (booking.status !== "unpaid") {
    const e = new Error("Only unpaid bookings can be cancelled");
    // @ts-ignore
    e.status = 400;
    throw e;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const item of booking.items) {
        await SeatMapModel.updateOne(
          {
            eventId: booking.eventId,
            "seats.x": item.seatCoords.x,
            "seats.y": item.seatCoords.y,
            "seats.reservedBy": booking.userId,
          },
          {
            $set: { "seats.$.status": "available" },
            $unset: { "seats.$.reservedBy": "", "seats.$.reservedUntil": "" },
          },
          { session }
        );
      }

      await BookingModel.updateOne(
        { _id: booking._id, status: "unpaid" },
        { $set: { status: "expired" } },
        { session }
      );
    });
  } finally {
    session.endSession();
  }
};

// Payment finalization.
//
// These back the simulated-payment endpoints today and are the seam a real
// payment provider plugs into later. Both are owner-scoped: the caller's user
// ID is required, never inferred from the booking itself.

/**
 * Loads a booking inside the transaction and asserts the caller may still act
 * on it. Reading inside the session means the guards below are evaluated
 * against the same snapshot the subsequent conditional updates run on.
 */
const loadPayableBooking = async (
  bookingId: string,
  userId: string,
  now: Date,
  session: mongoose.ClientSession
): Promise<IBooking> => {
  const booking = await BookingModel.findById(bookingId).session(session).lean();

  if (!booking) throw httpError(404, "Booking not found");

  // 403 rather than 404: the caller is authenticated, the resource exists, and
  // they are simply not its owner.
  if (booking.userId.toString() !== userId) {
    throw httpError(403, "You do not own this booking");
  }

  if (booking.status !== "unpaid") {
    throw httpError(409, `Booking is already ${booking.status}`);
  }

  if (!booking.expiresAt || booking.expiresAt <= now) {
    throw httpError(410, "This seat hold has expired");
  }

  return booking as IBooking;
};

export const finalizePaidBooking = async (
  bookingId: string,
  userId: string
) => {
  if (!Types.ObjectId.isValid(bookingId)) {
    throw httpError(400, "Invalid booking ID");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const now = new Date();
      const booking = await loadPayableBooking(bookingId, userId, now, session);

      // Conditional transition. The guards above are re-stated here so a
      // concurrent expiry sweep or double submit cannot slip between the read
      // and the write.
      //
      // `matchedCount`, not `modifiedCount`: Mongoose's `timestamps: true`
      // appends an `updatedAt` bump to every update, so `modifiedCount` is 1
      // even when the write changed nothing else.
      const marked = await BookingModel.updateOne(
        {
          _id: booking._id,
          userId: booking.userId,
          status: "unpaid",
          expiresAt: { $gt: now },
        },
        { $set: { status: "paid" } },
        { session }
      );

      if (marked.matchedCount !== 1) {
        throw httpError(409, "Booking is no longer payable");
      }

      // Sell each seat, requiring that this booking still holds it.
      //
      // `$elemMatch` in the FILTER is what makes this safe: it forces every
      // condition to hold for one and the same array element. Listing the same
      // conditions as top-level dotted paths would let them match across
      // different seats. `arrayFilters` then targets that seat by its
      // coordinates, which the schema guarantees are unique within a map.
      for (const item of booking.items) {
        const { x, y } = item.seatCoords;

        const sold = await SeatMapModel.updateOne(
          {
            eventId: booking.eventId,
            seats: {
              $elemMatch: {
                x,
                y,
                status: "reserved",
                reservedBy: booking.userId,
                reservedUntil: { $gt: now },
              },
            },
          },
          {
            $set: { "seats.$[s].status": "sold" },
            $unset: {
              "seats.$[s].reservedBy": "",
              "seats.$[s].reservedUntil": "",
            },
          },
          { arrayFilters: [{ "s.x": x, "s.y": y }], session }
        );

        // Not held by this booking any more: expired and reclaimed, already
        // sold, or released. Abort — the transaction rolls the booking back to
        // unpaid so nothing is half-sold.
        if (sold.matchedCount !== 1) {
          throw httpError(
            409,
            `Seat (${x},${y}) is no longer held by this booking`
          );
        }
      }
    });
  } finally {
    session.endSession();
  }
};

export const finalizeFailedBooking = async (
  bookingId: string,
  userId: string
) => {
  if (!Types.ObjectId.isValid(bookingId)) {
    throw httpError(400, "Invalid booking ID");
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const now = new Date();
      const booking = await loadPayableBooking(bookingId, userId, now, session);

      const marked = await BookingModel.updateOne(
        {
          _id: booking._id,
          userId: booking.userId,
          status: "unpaid",
          expiresAt: { $gt: now },
        },
        { $set: { status: "failed" } },
        { session }
      );

      // See the note in finalizePaidBooking: `modifiedCount` is unusable here
      // because `timestamps: true` always bumps `updatedAt`.
      if (marked.matchedCount !== 1) {
        throw httpError(409, "Booking is no longer in a failable state");
      }

      // TODO(WP1.3): this release filter matches across array elements and can
      // free the wrong seat. Requiring an unexpired hold above limits the blast
      // radius until arrayFilters lands.
      for (const item of booking.items) {
        await SeatMapModel.updateOne(
          {
            eventId: booking.eventId,
            "seats.x": item.seatCoords.x,
            "seats.y": item.seatCoords.y,
            "seats.reservedBy": booking.userId,
          },
          {
            $set: { "seats.$.status": "available" },
            $unset: { "seats.$.reservedBy": "", "seats.$.reservedUntil": "" },
          },
          { session }
        );
      }
    });
  } finally {
    session.endSession();
  }
};

export const expireOverdueBookings = async () => {
  const now = new Date();

  // 1) Find overdue, unpaid bookings
  const overdue = await BookingModel.find({
    status: "unpaid",
    expiresAt: { $lte: now },
  })
    .lean()
    .exec();

  let expiredCount = 0;
  let releasedSeats = 0;

  for (const b of overdue) {
    // 2) Release any seats still held by this booking's user (and already expired)
    if (b.items?.length) {
      const bulkOps = b.items.map((item) => ({
        updateOne: {
          filter: {
            eventId: b.eventId,
            "seats.x": item.seatCoords.x,
            "seats.y": item.seatCoords.y,
            "seats.status": "reserved",
            "seats.reservedBy": b.userId,
            "seats.reservedUntil": { $lte: now },
          },
          update: {
            $set: { "seats.$.status": "available" },
            $unset: {
              "seats.$.reservedBy": "",
              "seats.$.reservedUntil": "",
            },
          },
        },
      }));

      if (bulkOps.length) {
        try {
          const res = await SeatMapModel.bulkWrite(bulkOps, { ordered: false });
          // @ts-ignore: bulk result varies by driver version
          releasedSeats += res?.modifiedCount || 0;
        } catch (err) {
          console.error("SeatMap bulk release error:", err);
        }
      }
    }

    // 3) Mark booking expired (only if still unpaid)
    const upd = await BookingModel.updateOne(
      { _id: b._id, status: "unpaid" },
      { $set: { status: "expired" } }
    ).exec();

    if (upd.modifiedCount === 1) expiredCount++;
  }

  return { expiredCount, releasedSeats };
};
