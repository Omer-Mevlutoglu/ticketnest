import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import BookingModel from "../src/models/bookingModel";
import SeatMapModel, { ISeat } from "../src/models/seatMapModel";
import {
  cancelBooking,
  expireOverdueBookings,
  finalizeFailedBooking,
} from "../src/services/bookingService";
import {
  createAttendee,
  createBooking,
  createEventWithSeatMap,
} from "./factories";

/**
 * WP1.3 — releases must free exactly the seats a booking holds.
 *
 * The bug these cover: filtering with `"seats.x"`, `"seats.y"` and
 * `"seats.reservedBy"` as separate dotted paths lets MongoDB satisfy each
 * condition from a different array element, so the positional `$` can update
 * the wrong seat entirely.
 */

const future = () => new Date(Date.now() + 10 * 60_000);
const past = () => new Date(Date.now() - 60_000);

const reserve = async (
  eventId: Types.ObjectId,
  userId: Types.ObjectId,
  coords: Array<{ x: number; y: number }>,
  reservedUntil: Date = future()
) => {
  for (const { x, y } of coords) {
    await SeatMapModel.updateOne(
      { eventId },
      {
        $set: {
          "seats.$[s].status": "reserved",
          "seats.$[s].reservedBy": userId,
          "seats.$[s].reservedUntil": reservedUntil,
        },
      },
      { arrayFilters: [{ "s.x": x, "s.y": y }] }
    );
  }
};

const seatAt = async (
  eventId: Types.ObjectId,
  x: number,
  y: number
): Promise<ISeat> => {
  const map = await SeatMapModel.findOne({ eventId }).lean();
  return map!.seats.find((s) => s.x === x && s.y === y)!;
};

describe("WP1.3 — exact-seat release", () => {
  describe("cancellation", () => {
    it("releases only the coordinates the booking holds", async () => {
      const { user } = await createAttendee();
      const { event } = await createEventWithSeatMap({}, { rows: 3, cols: 3 });
      const eventId = event._id as Types.ObjectId;
      const userId = user._id as Types.ObjectId;

      await reserve(eventId, userId, [
        { x: 0, y: 0 },
        { x: 2, y: 2 },
      ]);
      const booking = await createBooking({
        userId,
        eventId,
        items: [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
      });

      const result = await cancelBooking(String(userId), String(booking._id));

      expect(result.releasedSeats).toBe(1);
      expect((await seatAt(eventId, 0, 0)).status).toBe("available");
      // Held by the same user, but not part of this booking.
      expect((await seatAt(eventId, 2, 2)).status).toBe("reserved");
    });

    it("never releases another user's seat sharing an x or y coordinate", async () => {
      const { user: mine } = await createAttendee();
      const { user: theirs } = await createAttendee();
      const { event } = await createEventWithSeatMap({}, { rows: 3, cols: 3 });
      const eventId = event._id as Types.ObjectId;
      const myId = mine._id as Types.ObjectId;
      const theirId = theirs._id as Types.ObjectId;

      // The other user holds seats that share an x and a y with mine. Under the
      // old cross-element matching, cancelling mine could free one of theirs.
      await reserve(eventId, myId, [{ x: 1, y: 1 }]);
      await reserve(eventId, theirId, [
        { x: 1, y: 2 },
        { x: 2, y: 1 },
      ]);

      const booking = await createBooking({
        userId: myId,
        eventId,
        items: [{ seatCoords: { x: 1, y: 1 }, price: 100 }],
      });

      await cancelBooking(String(myId), String(booking._id));

      expect((await seatAt(eventId, 1, 1)).status).toBe("available");

      for (const [x, y] of [
        [1, 2],
        [2, 1],
      ]) {
        const seat = await seatAt(eventId, x, y);
        expect(seat.status).toBe("reserved");
        expect(String(seat.reservedBy)).toBe(String(theirId));
      }
    });

    it("does not release a seat already reclaimed by someone else", async () => {
      const { user: mine } = await createAttendee();
      const { user: theirs } = await createAttendee();
      const { event } = await createEventWithSeatMap();
      const eventId = event._id as Types.ObjectId;

      const booking = await createBooking({
        userId: mine._id as Types.ObjectId,
        eventId,
        items: [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
      });
      await reserve(eventId, theirs._id as Types.ObjectId, [{ x: 0, y: 0 }]);

      const result = await cancelBooking(
        String(mine._id),
        String(booking._id)
      );

      // Cancellation still succeeds — it just has nothing of its own to free.
      expect(result.releasedSeats).toBe(0);
      const seat = await seatAt(eventId, 0, 0);
      expect(seat.status).toBe("reserved");
      expect(String(seat.reservedBy)).toBe(String(theirs._id));
    });

    it("refuses to cancel someone else's booking", async () => {
      const { user: owner } = await createAttendee();
      const { user: other } = await createAttendee();
      const { event } = await createEventWithSeatMap();
      const booking = await createBooking({
        userId: owner._id as Types.ObjectId,
        eventId: event._id as Types.ObjectId,
      });

      await expect(
        cancelBooking(String(other._id), String(booking._id))
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        BookingModel.findById(booking._id).lean().then((b) => b!.status)
      ).resolves.toBe("unpaid");
    });

    it("refuses to cancel a booking that is not unpaid", async () => {
      const { user } = await createAttendee();
      const { event } = await createEventWithSeatMap();
      const booking = await createBooking({
        userId: user._id as Types.ObjectId,
        eventId: event._id as Types.ObjectId,
        status: "paid",
      });

      await expect(
        cancelBooking(String(user._id), String(booking._id))
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe("failed payment", () => {
    it("releases exactly the seats it holds and leaves the rest alone", async () => {
      const { user: mine } = await createAttendee();
      const { user: theirs } = await createAttendee();
      const { event } = await createEventWithSeatMap({}, { rows: 3, cols: 3 });
      const eventId = event._id as Types.ObjectId;
      const myId = mine._id as Types.ObjectId;

      await reserve(eventId, myId, [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]);
      await reserve(eventId, theirs._id as Types.ObjectId, [{ x: 0, y: 1 }]);

      const booking = await createBooking({
        userId: myId,
        eventId,
        items: [
          { seatCoords: { x: 0, y: 0 }, price: 100 },
          { seatCoords: { x: 1, y: 0 }, price: 100 },
        ],
      });

      await finalizeFailedBooking(String(booking._id), String(myId));

      await expect(
        BookingModel.findById(booking._id).lean().then((b) => b!.status)
      ).resolves.toBe("failed");
      expect((await seatAt(eventId, 0, 0)).status).toBe("available");
      expect((await seatAt(eventId, 1, 0)).status).toBe("available");
      expect((await seatAt(eventId, 0, 1)).status).toBe("reserved");
    });
  });

  describe("expiry sweep", () => {
    it("releases only overdue reservations", async () => {
      const { user } = await createAttendee();
      const { event } = await createEventWithSeatMap({}, { rows: 2, cols: 3 });
      const eventId = event._id as Types.ObjectId;
      const userId = user._id as Types.ObjectId;

      await reserve(eventId, userId, [{ x: 0, y: 0 }], past());
      await reserve(eventId, userId, [{ x: 1, y: 0 }], future());

      const overdue = await createBooking({
        userId,
        eventId,
        items: [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
        expiresAt: past(),
      });
      const live = await createBooking({
        userId,
        eventId,
        items: [{ seatCoords: { x: 1, y: 0 }, price: 100 }],
        expiresAt: future(),
      });

      const result = await expireOverdueBookings();

      expect(result).toEqual({
        expiredCount: 1,
        releasedSeats: 1,
        failedCount: 0,
      });
      expect((await seatAt(eventId, 0, 0)).status).toBe("available");
      expect((await seatAt(eventId, 1, 0)).status).toBe("reserved");
      await expect(
        BookingModel.findById(overdue._id).lean().then((b) => b!.status)
      ).resolves.toBe("expired");
      await expect(
        BookingModel.findById(live._id).lean().then((b) => b!.status)
      ).resolves.toBe("unpaid");
    });

    it("does not release a lapsed seat that another user already reclaimed", async () => {
      const { user: mine } = await createAttendee();
      const { user: theirs } = await createAttendee();
      const { event } = await createEventWithSeatMap();
      const eventId = event._id as Types.ObjectId;

      await createBooking({
        userId: mine._id as Types.ObjectId,
        eventId,
        items: [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
        expiresAt: past(),
      });
      // Someone else picked the seat up again with a fresh hold.
      await reserve(eventId, theirs._id as Types.ObjectId, [{ x: 0, y: 0 }]);

      const result = await expireOverdueBookings();

      expect(result.expiredCount).toBe(1);
      expect(result.releasedSeats).toBe(0);
      const seat = await seatAt(eventId, 0, 0);
      expect(seat.status).toBe("reserved");
      expect(String(seat.reservedBy)).toBe(String(theirs._id));
    });

    it("is idempotent — a second run reports no additional work", async () => {
      const { user } = await createAttendee();
      const { event } = await createEventWithSeatMap();
      const eventId = event._id as Types.ObjectId;
      const userId = user._id as Types.ObjectId;

      await reserve(eventId, userId, [{ x: 0, y: 0 }], past());
      await createBooking({
        userId,
        eventId,
        items: [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
        expiresAt: past(),
      });

      const first = await expireOverdueBookings();
      const second = await expireOverdueBookings();

      expect(first).toEqual({
        expiredCount: 1,
        releasedSeats: 1,
        failedCount: 0,
      });
      expect(second).toEqual({
        expiredCount: 0,
        releasedSeats: 0,
        failedCount: 0,
      });
    });
  });
});
