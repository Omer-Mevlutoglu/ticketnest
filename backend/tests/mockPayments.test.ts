import type { Express } from "express";
import { Types } from "mongoose";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import BookingModel from "../src/models/bookingModel";
import SeatMapModel from "../src/models/seatMapModel";
import {
  createAttendee,
  createBooking,
  createEventWithSeatMap,
} from "./factories";
import { buildTestApp, loginAgent } from "./helpers";

/**
 * WP1.2 — the simulated payment flow must be explicitly configured, owner-only,
 * and impossible to influence with a client-supplied amount.
 */
describe("WP1.2 — simulated payments", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  afterEach(() => {
    process.env.ENABLE_MOCK_PAYMENTS = "true";
  });

  const setup = async () => {
    const { user: owner } = await createAttendee();
    const { event } = await createEventWithSeatMap();
    const eventId = event._id as Types.ObjectId;
    const ownerId = owner._id as Types.ObjectId;

    await SeatMapModel.updateOne(
      { eventId },
      {
        $set: {
          "seats.$[s].status": "reserved",
          "seats.$[s].reservedBy": ownerId,
          "seats.$[s].reservedUntil": new Date(Date.now() + 10 * 60_000),
        },
      },
      { arrayFilters: [{ "s.x": 0, "s.y": 0 }] }
    );

    const booking = await createBooking({
      userId: ownerId,
      eventId,
      items: [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
    });

    return { owner, booking };
  };

  describe("configuration", () => {
    it("reports the flag through /api/config", async () => {
      process.env.ENABLE_MOCK_PAYMENTS = "true";
      await expect(
        request(app).get("/api/config").then((r) => r.body.mockPaymentsEnabled)
      ).resolves.toBe(true);

      process.env.ENABLE_MOCK_PAYMENTS = "false";
      await expect(
        request(app).get("/api/config").then((r) => r.body.mockPaymentsEnabled)
      ).resolves.toBe(false);
    });

    it("returns 404 for both endpoints when disabled", async () => {
      const { owner, booking } = await setup();
      const agent = await loginAgent(app, owner.email);
      process.env.ENABLE_MOCK_PAYMENTS = "false";

      const pay = await agent.post(`/api/bookings/${booking._id}/mock-pay`);
      const fail = await agent.post(`/api/bookings/${booking._id}/mock-fail`);

      expect(pay.status).toBe(404);
      expect(fail.status).toBe(404);
      await expect(
        BookingModel.findById(booking._id).lean().then((b) => b!.status)
      ).resolves.toBe("unpaid");
    });

    it("rejects an unparseable flag value", async () => {
      const { owner, booking } = await setup();
      const agent = await loginAgent(app, owner.email);
      process.env.ENABLE_MOCK_PAYMENTS = "maybe";

      const res = await agent.post(`/api/bookings/${booking._id}/mock-pay`);

      expect(res.status).toBe(500);
    });
  });

  describe("route naming", () => {
    it("serves the deprecated /pay-test alias identically", async () => {
      const { owner, booking } = await setup();
      const agent = await loginAgent(app, owner.email);

      const res = await agent.post(`/api/bookings/${booking._id}/pay-test`);

      expect(res.status).toBe(200);
      await expect(
        BookingModel.findById(booking._id).lean().then((b) => b!.status)
      ).resolves.toBe("paid");
    });

    it("gates the deprecated alias behind the same flag", async () => {
      const { owner, booking } = await setup();
      const agent = await loginAgent(app, owner.email);
      process.env.ENABLE_MOCK_PAYMENTS = "false";

      const res = await agent.post(`/api/bookings/${booking._id}/pay-test`);

      expect(res.status).toBe(404);
    });
  });

  describe("authorization", () => {
    it("requires authentication", async () => {
      const { booking } = await setup();

      const res = await request(app).post(
        `/api/bookings/${booking._id}/mock-pay`
      );

      expect(res.status).toBe(401);
    });

    it("works only for the booking owner", async () => {
      const { booking } = await setup();
      await createAttendee({ email: "notmine@example.test" });
      const other = await loginAgent(app, "notmine@example.test");

      const res = await other.post(`/api/bookings/${booking._id}/mock-pay`);

      expect(res.status).toBe(403);
    });
  });

  describe("client-supplied amounts", () => {
    it("ignores a price in the request body", async () => {
      const { owner, booking } = await setup();
      const agent = await loginAgent(app, owner.email);

      const res = await agent
        .post(`/api/bookings/${booking._id}/mock-pay`)
        .send({ total: 1, amount: 1, items: [{ price: 1 }] });

      expect(res.status).toBe(200);

      // The stored total is the only source of truth.
      const stored = await BookingModel.findById(booking._id).lean();
      expect(stored!.total).toBe(100);
      expect(stored!.items).toHaveLength(1);
      expect(stored!.items[0].price).toBe(100);
    });
  });
});
