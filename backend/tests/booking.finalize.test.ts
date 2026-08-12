import type { Express } from "express";
import { Types } from "mongoose";
import { beforeAll, describe, expect, it } from "vitest";
import BookingModel from "../src/models/bookingModel";
import SeatMapModel, { ISeat } from "../src/models/seatMapModel";
import {
  createAttendee,
  createBooking,
  createEventWithSeatMap,
} from "./factories";
import { buildTestApp, loginAgent } from "./helpers";

/**
 * WP1.1 — payment and failure transitions must be owner-scoped, state-guarded,
 * and atomic.
 */

const HOLD = () => new Date(Date.now() + 10 * 60_000);

/** Reserves the given coordinates for a user, mirroring what booking creation does. */
const reserveSeats = async (
  eventId: Types.ObjectId,
  userId: Types.ObjectId,
  coords: Array<{ x: number; y: number }>,
  reservedUntil: Date = HOLD()
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

describe("WP1.1 — finalizing a booking", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  /** Owner with a live hold on (0,0), ready to pay. */
  const setup = async () => {
    const { user: owner } = await createAttendee({ email: `owner-${Date.now()}@example.test` });
    const { event } = await createEventWithSeatMap();
    const eventId = event._id as Types.ObjectId;
    const ownerId = owner._id as Types.ObjectId;

    await reserveSeats(eventId, ownerId, [{ x: 0, y: 0 }]);
    const booking = await createBooking({
      userId: ownerId,
      eventId,
      items: [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
    });

    return { owner, ownerId, event, eventId, booking };
  };

  describe("ownership", () => {
    it("refuses to let another attendee pay a booking (403)", async () => {
      const { booking, eventId } = await setup();
      await createAttendee({ email: "attacker@example.test" });
      const attacker = await loginAgent(app, "attacker@example.test");

      const res = await attacker.post(`/api/bookings/${booking._id}/mock-pay`);

      expect(res.status).toBe(403);
      await expect(
        BookingModel.findById(booking._id).lean().then((b) => b!.status)
      ).resolves.toBe("unpaid");
      expect((await seatAt(eventId, 0, 0)).status).toBe("reserved");
    });

    it("refuses to let another attendee fail a booking (403)", async () => {
      const { booking, eventId } = await setup();
      await createAttendee({ email: "saboteur@example.test" });
      const attacker = await loginAgent(app, "saboteur@example.test");

      const res = await attacker.post(`/api/bookings/${booking._id}/mock-fail`);

      expect(res.status).toBe(403);
      await expect(
        BookingModel.findById(booking._id).lean().then((b) => b!.status)
      ).resolves.toBe("unpaid");
      expect((await seatAt(eventId, 0, 0)).status).toBe("reserved");
    });

    it("lets the owner pay, marking the booking paid and the seats sold", async () => {
      const { owner, booking, eventId } = await setup();
      const agent = await loginAgent(app, owner.email);

      const res = await agent.post(`/api/bookings/${booking._id}/mock-pay`);

      expect(res.status).toBe(200);
      await expect(
        BookingModel.findById(booking._id).lean().then((b) => b!.status)
      ).resolves.toBe("paid");

      const seat = await seatAt(eventId, 0, 0);
      expect(seat.status).toBe("sold");
      expect(seat.reservedBy).toBeUndefined();
      expect(seat.reservedUntil).toBeUndefined();
    });

    it("returns 404 for a booking that does not exist", async () => {
      const { owner } = await setup();
      const agent = await loginAgent(app, owner.email);

      const res = await agent.post(
        `/api/bookings/${new Types.ObjectId()}/mock-pay`
      );

      expect(res.status).toBe(404);
    });
  });

  describe("state guards", () => {
    it("refuses to pay an expired hold (410)", async () => {
      const { owner, ownerId, eventId } = await setup();
      const expired = await createBooking({
        userId: ownerId,
        eventId,
        items: [{ seatCoords: { x: 1, y: 0 }, price: 100 }],
        expiresAt: new Date(Date.now() - 1_000),
      });
      const agent = await loginAgent(app, owner.email);

      const res = await agent.post(`/api/bookings/${expired._id}/mock-pay`);

      expect(res.status).toBe(410);
      await expect(
        BookingModel.findById(expired._id).lean().then((b) => b!.status)
      ).resolves.toBe("unpaid");
    });

    it.each(["paid", "failed", "expired", "refunded"] as const)(
      "refuses to pay a booking that is already %s (409)",
      async (status) => {
        const { owner, ownerId, eventId } = await setup();
        const other = await createBooking({
          userId: ownerId,
          eventId,
          status,
        });
        const agent = await loginAgent(app, owner.email);

        const res = await agent.post(`/api/bookings/${other._id}/mock-pay`);

        expect(res.status).toBe(409);
        await expect(
          BookingModel.findById(other._id).lean().then((b) => b!.status)
        ).resolves.toBe(status);
      }
    );

    it("refuses a second payment for the same booking", async () => {
      const { owner, booking } = await setup();
      const agent = await loginAgent(app, owner.email);

      await expect(
        agent
          .post(`/api/bookings/${booking._id}/mock-pay`)
          .then((r) => r.status)
      ).resolves.toBe(200);

      const second = await agent.post(`/api/bookings/${booking._id}/mock-pay`);
      expect(second.status).toBe(409);
    });

    it("refuses to sell a seat reclaimed by another user after expiry", async () => {
      const { owner, ownerId, eventId } = await setup();
      const { user: thief } = await createAttendee();

      // The owner's hold is still live on the booking, but the seat itself was
      // reclaimed — exactly the window the seat-level guard has to close.
      const booking = await createBooking({
        userId: ownerId,
        eventId,
        items: [{ seatCoords: { x: 1, y: 1 }, price: 100 }],
      });
      await reserveSeats(eventId, thief._id as Types.ObjectId, [{ x: 1, y: 1 }]);

      const agent = await loginAgent(app, owner.email);
      const res = await agent.post(`/api/bookings/${booking._id}/mock-pay`);

      expect(res.status).toBe(409);

      // The seat still belongs to the other user, and the booking rolled back.
      const seat = await seatAt(eventId, 1, 1);
      expect(seat.status).toBe("reserved");
      expect(String(seat.reservedBy)).toBe(String(thief._id));
      await expect(
        BookingModel.findById(booking._id).lean().then((b) => b!.status)
      ).resolves.toBe("unpaid");
    });
  });

  describe("atomicity", () => {
    it("rolls the booking back when one seat of several cannot be sold", async () => {
      const { owner, ownerId, eventId } = await setup();
      const { user: thief } = await createAttendee();

      const booking = await createBooking({
        userId: ownerId,
        eventId,
        items: [
          { seatCoords: { x: 0, y: 1 }, price: 100 },
          { seatCoords: { x: 1, y: 1 }, price: 100 },
        ],
      });

      // First seat is legitimately held; second was taken by someone else.
      await reserveSeats(eventId, ownerId, [{ x: 0, y: 1 }]);
      await reserveSeats(eventId, thief._id as Types.ObjectId, [{ x: 1, y: 1 }]);

      const agent = await loginAgent(app, owner.email);
      const res = await agent.post(`/api/bookings/${booking._id}/mock-pay`);

      expect(res.status).toBe(409);

      // Nothing half-applied: booking still unpaid, first seat NOT sold.
      await expect(
        BookingModel.findById(booking._id).lean().then((b) => b!.status)
      ).resolves.toBe("unpaid");
      expect((await seatAt(eventId, 0, 1)).status).toBe("reserved");
      expect((await seatAt(eventId, 1, 1)).status).toBe("reserved");
    });
  });
});
