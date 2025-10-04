import mongoose, { Types } from "mongoose";
import BookingModel, { IBooking, IBookingItem } from "../models/bookingModel";
import SeatMapModel from "../models/seatMapModel";
import { eventModel } from "../models/eventModel";

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

// Manual helpers for testing without Stripe

export const finalizePaidBooking = async (bookingId: string) => {
  if (!Types.ObjectId.isValid(bookingId)) {
    const e = new Error("Invalid booking ID");
    // @ts-ignore
    e.status = 400;
    throw e;
  }

  const booking = await BookingModel.findById(bookingId).lean();
  if (!booking) {
    const e = new Error("Booking not found");
    // @ts-ignore
    e.status = 404;
    throw e;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // Mark booking paid
      await BookingModel.updateOne(
        { _id: booking._id, status: "unpaid" },
        { $set: { status: "paid" } },
        { session }
      );

      // Flip EACH seat to sold using arrayFilters (robust)
      for (const item of booking.items) {
        const res = await SeatMapModel.updateOne(
          { eventId: booking.eventId },
          {
            $set: { "seats.$[s].status": "sold" },
            $unset: {
              "seats.$[s].reservedBy": "",
              "seats.$[s].reservedUntil": "",
            },
          },
          {
            arrayFilters: [
              {
                "s.x": item.seatCoords.x,
                "s.y": item.seatCoords.y,
              },
            ],
            session,
          }
        );

        if (res.modifiedCount !== 1) {
          const e = new Error(
            `Failed to mark seat (${item.seatCoords.x},${item.seatCoords.y}) as sold`
          );
          // @ts-ignore
          e.status = 409;
          throw e;
        }
      }
    });
  } finally {
    session.endSession();
  }
};

export const finalizeFailedBooking = async (bookingId: string) => {
  if (!Types.ObjectId.isValid(bookingId)) {
    const e = new Error("Invalid booking ID");
    // @ts-ignore
    e.status = 400;
    throw e;
  }

  const booking = await BookingModel.findById(bookingId).lean();
  if (!booking) {
    const e = new Error("Booking not found");
    // @ts-ignore
    e.status = 404;
    throw e;
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await BookingModel.updateOne(
        { _id: booking._id, status: "unpaid" },
        { $set: { status: "failed" } },
        { session }
      );

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
