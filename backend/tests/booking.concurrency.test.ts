import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import BookingModel from "../src/models/bookingModel";
import SeatMapModel, { ISeat } from "../src/models/seatMapModel";
import {
  createBookingFromSelection,
  finalizePaidBooking,
  MAX_SEATS_PER_BOOKING,
} from "../src/services/bookingService";
import { createAttendee, createEventWithSeatMap } from "./factories";

/**
 * WP1.4 — the seat-hold design is the centrepiece of this project, so its
 * behaviour under contention is asserted rather than assumed.
 */

const seatAt = async (
  eventId: Types.ObjectId,
  x: number,
  y: number
): Promise<ISeat> => {
  const map = await SeatMapModel.findOne({ eventId }).lean();
  return map!.seats.find((s) => s.x === x && s.y === y)!;
};

const statusOf = (result: PromiseSettledResult<unknown>): number | undefined =>
  result.status === "rejected"
    ? (result.reason as { status?: number }).status
    : undefined;

describe("WP1.4 — booking concurrency", () => {
  it("lets exactly one of two simultaneous requests take the same seat", async () => {
    const { user: a } = await createAttendee();
    const { user: b } = await createAttendee();
    const { event } = await createEventWithSeatMap();
    const eventId = event._id as Types.ObjectId;
    const dto = { eventId: String(eventId), seats: [{ x: 0, y: 0 }] };

    const results = await Promise.allSettled([
      createBookingFromSelection(String(a._id), dto),
      createBookingFromSelection(String(b._id), dto),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(statusOf(rejected[0])).toBe(409);

    // One reservation, one booking — the loser left nothing behind.
    const seat = await seatAt(eventId, 0, 0);
    expect(seat.status).toBe("reserved");
    await expect(BookingModel.countDocuments()).resolves.toBe(1);

    const winner = (fulfilled[0] as PromiseFulfilledResult<{ userId: Types.ObjectId }>)
      .value;
    expect(String(seat.reservedBy)).toBe(String(winner.userId));
  });

  it("holds under heavier contention for a single seat", async () => {
    const { event } = await createEventWithSeatMap();
    const eventId = event._id as Types.ObjectId;
    const users = await Promise.all(
      Array.from({ length: 5 }, () => createAttendee())
    );

    const results = await Promise.allSettled(
      users.map(({ user }) =>
        createBookingFromSelection(String(user._id), {
          eventId: String(eventId),
          seats: [{ x: 1, y: 1 }],
        })
      )
    );

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const rejection of results.filter((r) => r.status === "rejected")) {
      expect(statusOf(rejection)).toBe(409);
    }
    await expect(BookingModel.countDocuments()).resolves.toBe(1);
  });

  it("reserves nothing when one seat of a selection is taken", async () => {
    const { user: holder } = await createAttendee();
    const { user: latecomer } = await createAttendee();
    const { event } = await createEventWithSeatMap();
    const eventId = event._id as Types.ObjectId;

    await createBookingFromSelection(String(holder._id), {
      eventId: String(eventId),
      seats: [{ x: 1, y: 1 }],
    });

    await expect(
      createBookingFromSelection(String(latecomer._id), {
        eventId: String(eventId),
        seats: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      })
    ).rejects.toMatchObject({ status: 409 });

    // This is what the transaction is for: the free seat must not be left held.
    expect((await seatAt(eventId, 0, 0)).status).toBe("available");
    await expect(
      BookingModel.countDocuments({ userId: latecomer._id })
    ).resolves.toBe(0);
  });

  it("lets another user reclaim a seat once the hold lapses", async () => {
    const { user: first } = await createAttendee();
    const { user: second } = await createAttendee();
    const { event } = await createEventWithSeatMap();
    const eventId = event._id as Types.ObjectId;

    const original = await createBookingFromSelection(String(first._id), {
      eventId: String(eventId),
      seats: [{ x: 0, y: 0 }],
    });

    // Age the hold without waiting ten minutes.
    await SeatMapModel.updateOne(
      { eventId },
      { $set: { "seats.$[s].reservedUntil": new Date(Date.now() - 1_000) } },
      { arrayFilters: [{ "s.x": 0, "s.y": 0 }] }
    );

    const reclaimed = await createBookingFromSelection(String(second._id), {
      eventId: String(eventId),
      seats: [{ x: 0, y: 0 }],
    });

    const seat = await seatAt(eventId, 0, 0);
    expect(String(seat.reservedBy)).toBe(String(second._id));
    expect(String(reclaimed.userId)).toBe(String(second._id));

    // And the original holder can no longer pay for it.
    await expect(
      finalizePaidBooking(String(original._id), String(first._id))
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      BookingModel.findById(original._id).lean().then((b) => b!.status)
    ).resolves.toBe("unpaid");
    expect(String((await seatAt(eventId, 0, 0)).reservedBy)).toBe(
      String(second._id)
    );
  });

  it("blocks a same-user second hold on a seat they already hold", async () => {
    const { user } = await createAttendee();
    const { event } = await createEventWithSeatMap();
    const eventId = event._id as Types.ObjectId;

    await createBookingFromSelection(String(user._id), {
      eventId: String(eventId),
      seats: [{ x: 0, y: 0 }],
    });

    await expect(
      createBookingFromSelection(String(user._id), {
        eventId: String(eventId),
        seats: [{ x: 0, y: 0 }],
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  describe("seat limit", () => {
    it(`rejects more than ${MAX_SEATS_PER_BOOKING} distinct seats`, async () => {
      const { user } = await createAttendee();
      const { event } = await createEventWithSeatMap({}, { rows: 4, cols: 4 });
      const eventId = event._id as Types.ObjectId;

      const tooMany = Array.from(
        { length: MAX_SEATS_PER_BOOKING + 1 },
        (_, i) => ({ x: i % 4, y: Math.floor(i / 4) })
      );

      await expect(
        createBookingFromSelection(String(user._id), {
          eventId: String(eventId),
          seats: tooMany,
        })
      ).rejects.toMatchObject({ status: 400 });

      // Nothing was held while validating.
      const map = await SeatMapModel.findOne({ eventId }).lean();
      expect(map!.seats.every((s) => s.status === "available")).toBe(true);
    });

    it("cannot be exceeded by repeating coordinates", async () => {
      const { user } = await createAttendee();
      const { event } = await createEventWithSeatMap({}, { rows: 4, cols: 4 });
      const eventId = event._id as Types.ObjectId;

      // Twelve entries, three distinct seats — allowed, and only three held.
      const withDuplicates = Array.from({ length: 12 }, (_, i) => ({
        x: i % 3,
        y: 0,
      }));

      const booking = await createBookingFromSelection(String(user._id), {
        eventId: String(eventId),
        seats: withDuplicates,
      });

      expect(booking.items).toHaveLength(3);

      const map = await SeatMapModel.findOne({ eventId }).lean();
      expect(map!.seats.filter((s) => s.status === "reserved")).toHaveLength(3);
    });

    it(`accepts exactly ${MAX_SEATS_PER_BOOKING} seats`, async () => {
      const { user } = await createAttendee();
      const { event } = await createEventWithSeatMap({}, { rows: 4, cols: 4 });

      const booking = await createBookingFromSelection(String(user._id), {
        eventId: String(event._id),
        seats: Array.from({ length: MAX_SEATS_PER_BOOKING }, (_, i) => ({
          x: i % 4,
          y: Math.floor(i / 4),
        })),
      });

      expect(booking.items).toHaveLength(MAX_SEATS_PER_BOOKING);
    });
  });
});
