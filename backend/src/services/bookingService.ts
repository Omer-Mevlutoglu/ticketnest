import mongoose, { Types } from "mongoose";
import BookingModel, { IBooking, IBookingItem } from "../models/bookingModel";
import SeatMapModel from "../models/seatMapModel";
import { eventModel } from "../models/eventModel";
import { httpError } from "../utils/httpError";
import { redactSensitive } from "../utils/redactSensitive";

const HOLD_MS = 10 * 60 * 1000;

/** Upper bound on how many distinct seats one booking may hold. */
export const MAX_SEATS_PER_BOOKING = 6;

/**
 * Releases one seat back to `available`, but only if it is still held by
 * `holderId`.
 *
 * Two things make this correct where the previous implementation was not:
 *
 * 1. `$elemMatch` in the FILTER. Listing `"seats.x"`, `"seats.y"` and
 *    `"seats.reservedBy"` as separate dotted paths lets MongoDB satisfy each
 *    one from a DIFFERENT array element — so a document could match while no
 *    single seat met all three conditions, and the positional `$` would then
 *    update whichever element matched first. That is how cancelling a booking
 *    could free somebody else's seat. `$elemMatch` requires one element to
 *    satisfy every condition.
 *
 * 2. `matchedCount`, not `modifiedCount`. `timestamps: true` bumps `updatedAt`
 *    on every update, so `modifiedCount` is 1 even when nothing else changed.
 *
 * Returns whether this call is the one that released the seat. A `false` is not
 * an error: the seat may already have been released, sold, or reclaimed. Every
 * release path here is idempotent by design.
 */
const releaseHeldSeat = async (
  eventId: Types.ObjectId,
  holderId: Types.ObjectId,
  coords: { x: number; y: number },
  options: {
    session?: mongoose.ClientSession;
    /** Only release if the hold had already lapsed by this instant. */
    expiredAtOrBefore?: Date;
  } = {}
): Promise<boolean> => {
  const heldSeat: Record<string, unknown> = {
    x: coords.x,
    y: coords.y,
    status: "reserved",
    reservedBy: holderId,
  };

  if (options.expiredAtOrBefore) {
    heldSeat.reservedUntil = { $lte: options.expiredAtOrBefore };
  }

  const res = await SeatMapModel.updateOne(
    { eventId, seats: { $elemMatch: heldSeat } },
    {
      $set: { "seats.$[s].status": "available" },
      $unset: { "seats.$[s].reservedBy": "", "seats.$[s].reservedUntil": "" },
    },
    {
      arrayFilters: [{ "s.x": coords.x, "s.y": coords.y }],
      session: options.session,
    }
  );

  return res.matchedCount === 1;
};

export interface CreateBookingDTO {
  eventId: string;
  seats: Array<{ x: number; y: number }>;
}

export const createBookingFromSelection = async (
  userId: string,
  dto: CreateBookingDTO
): Promise<IBooking> => {
  if (!Types.ObjectId.isValid(dto.eventId)) {
    throw httpError(400, "Invalid event ID");
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
      throw httpError(400, "Invalid seat coordinates");
    }
    seatMap.set(`${s.x},${s.y}`, { x: s.x, y: s.y });
  }
  const seats = Array.from(seatMap.values());
  if (seats.length === 0) {
    throw httpError(400, "No seats provided");
  }

  // Enforced on the de-duplicated set, so repeating a coordinate cannot be used
  // to slip past the limit — and sending the same seat twice is not an error.
  if (seats.length > MAX_SEATS_PER_BOOKING) {
    throw httpError(
      400,
      `You can book at most ${MAX_SEATS_PER_BOOKING} seats at a time`
    );
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
    throw httpError(
      409,
      "You already hold one or more of these seats. Complete payment or wait for the hold to expire."
    );
  }

  const session = await mongoose.startSession();
  try {
    let booking!: IBooking;

    await session.withTransaction(async () => {
      // Booking creation and cancellation both write this same event document
      // in their transactions. MongoDB's write-conflict retry then forces a
      // racing operation to re-evaluate the lifecycle state after the winner
      // commits; a stale "published" read can never create a booking after a
      // cancellation has won.
      const lifecycleGuard = await eventModel.updateOne(
        {
          _id: eventOid,
          status: "published",
          isCancelled: { $ne: true },
        },
        { $inc: { lifecycleVersion: 1 } },
        { session }
      );

      if (lifecycleGuard.matchedCount !== 1) {
        throw httpError(404, "Event not found or not published");
      }

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
        throw httpError(409, `These seats are no longer available: ${list}`); 
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

/** Event fields the bookings and checkout screens render. */
const BOOKING_EVENT_SUMMARY =
  "title description venueName venueAddress startTime endTime poster";

export interface BookingEventSummary {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  venueName?: string;
  venueAddress?: string;
  startTime: Date;
  endTime: Date;
  poster?: string;
}

/**
 * A user's bookings, each with its event attached.
 *
 * The event is joined here rather than left to the client. Returning bare
 * `eventId`s meant the bookings page fetched one event per distinct id, and
 * checkout fetched another — a request count that grew with the list. This is
 * two queries total, regardless of how many bookings there are.
 *
 * `eventId` is left in place and `event` added alongside, so nothing that reads
 * the id has to change.
 */
export const getMyBookings = async (userId: string) => {
  const bookings = await BookingModel.find({
    userId: new Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .lean()
    .exec();

  if (bookings.length === 0) return [];

  const eventIds = Array.from(
    new Set(bookings.map((b) => String(b.eventId)))
  ).map((id) => new Types.ObjectId(id));

  const events = await eventModel
    .find({ _id: { $in: eventIds } })
    .select(BOOKING_EVENT_SUMMARY)
    .lean()
    .exec();

  const byId = new Map(events.map((e) => [String(e._id), e]));

  return bookings.map((booking) => ({
    ...booking,
    event: (byId.get(String(booking.eventId)) ??
      null) as BookingEventSummary | null,
  }));
};

/**
 * Cancels an unpaid booking and releases exactly the seats it holds.
 *
 * The booking transition and every seat release happen in one transaction, so a
 * cancellation is never half-applied.
 *
 * Note: the resulting status is `expired`. The schema has no `cancelled` state;
 * completing that state machine is WP5.3.
 */
export const cancelBooking = async (
  userId: string,
  bookingId: string
): Promise<{ releasedSeats: number }> => {
  if (!Types.ObjectId.isValid(bookingId)) {
    throw httpError(400, "Invalid booking ID");
  }

  let releasedSeats = 0;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // withTransaction retries the callback on transient errors, so any
      // running total has to be reset here rather than outside.
      releasedSeats = 0;

      const booking = await BookingModel.findById(bookingId)
        .session(session)
        .lean();

      if (!booking) throw httpError(404, "Booking not found");
      if (booking.userId.toString() !== userId) {
        throw httpError(403, "You do not own this booking");
      }
      if (booking.status !== "unpaid") {
        throw httpError(409, `Booking is already ${booking.status}`);
      }

      const marked = await BookingModel.updateOne(
        { _id: booking._id, status: "unpaid" },
        { $set: { status: "expired" } },
        { session }
      );

      if (marked.matchedCount !== 1) {
        throw httpError(409, "Booking is no longer cancellable");
      }

      for (const item of booking.items) {
        const released = await releaseHeldSeat(
          booking.eventId,
          booking.userId,
          item.seatCoords,
          { session }
        );
        if (released) releasedSeats++;
      }
    });
  } finally {
    session.endSession();
  }

  return { releasedSeats };
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
  const booking = await BookingModel.findById(bookingId)
    .session(session)
    .lean<IBooking>();

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

  return booking;
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

      for (const item of booking.items) {
        await releaseHeldSeat(
          booking.eventId,
          booking.userId,
          item.seatCoords,
          { session }
        );
      }
    });
  } finally {
    session.endSession();
  }
};

export interface ExpireOverdueResult {
  /** Bookings this run moved from `unpaid` to `expired`. */
  expiredCount: number;
  /** Seats this run actually returned to `available`. */
  releasedSeats: number;
  /** Bookings skipped because releasing their seats failed. */
  failedCount: number;
}

/**
 * Releases lapsed holds and expires the bookings that own them.
 *
 * Deliberately not wrapped in a single transaction: it is a sweep over
 * unrelated bookings, and every write is conditional, so running it twice — or
 * concurrently with a user cancelling the same booking — converges to the same
 * state and reports no extra work the second time.
 *
 * A booking is only marked expired once its seats are released. If a release
 * throws, that booking is left alone for the next run rather than being closed
 * with its seats still locked.
 */
export const expireOverdueBookings = async (): Promise<ExpireOverdueResult> => {
  const now = new Date();

  const overdue = await BookingModel.find({
    status: "unpaid",
    expiresAt: { $lte: now },
  })
    .lean()
    .exec();

  let expiredCount = 0;
  let releasedSeats = 0;
  let failedCount = 0;

  for (const booking of overdue) {
    try {
      for (const item of booking.items ?? []) {
        const released = await releaseHeldSeat(
          booking.eventId,
          booking.userId,
          item.seatCoords,
          { expiredAtOrBefore: now }
        );
        if (released) releasedSeats++;
      }

      const marked = await BookingModel.updateOne(
        { _id: booking._id, status: "unpaid" },
        { $set: { status: "expired" } }
      ).exec();

      // matchedCount, not modifiedCount: `timestamps: true` makes the latter 1
      // even when the status filter excluded the document.
      if (marked.matchedCount === 1) expiredCount++;
    } catch (err) {
      failedCount++;
      console.error(
        `Failed to expire booking ${String(booking._id)}; leaving it for the next run.`,
        redactSensitive(err)
      );
    }
  }

  return { expiredCount, releasedSeats, failedCount };
};
