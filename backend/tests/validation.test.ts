import type { Express } from "express";
import { Types } from "mongoose";
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import BookingModel from "../src/models/bookingModel";
import { eventModel } from "../src/models/eventModel";
import { MAX_SEATS_PER_BOOKING } from "../src/services/bookingService";
import {
  createAttendee,
  createEventWithSeatMap,
  createOrganizer,
  DEFAULT_PASSWORD,
} from "./factories";
import { buildTestApp, loginAgent } from "./helpers";

/**
 * WP4.3 — schemas reject bad and dangerous shapes at the HTTP boundary, before
 * anything reaches a query or a transaction.
 */
describe("WP4.3 — request validation", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  describe("auth", () => {
    it("rejects a malformed email", async () => {
      const res = await request(app).post("/api/auth/register").send({
        username: "someone",
        email: "not-an-email",
        password: "password123",
        role: "attendee",
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      expect(res.body.message).toMatch(/email/i);
    });

    it("rejects a short password", async () => {
      const res = await request(app).post("/api/auth/register").send({
        username: "someone",
        email: "short@example.test",
        password: "abc",
        role: "attendee",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least 6/i);
    });

    it("refuses to let a client register itself as an admin", async () => {
      const res = await request(app).post("/api/auth/register").send({
        username: "sneaky",
        email: "sneaky@example.test",
        password: "password123",
        role: "admin",
      });

      expect(res.status).toBe(400);
    });

    it("rejects unknown keys rather than passing them through", async () => {
      const res = await request(app).post("/api/auth/register").send({
        username: "extra",
        email: "extra@example.test",
        password: "password123",
        role: "attendee",
        isApproved: true,
        sessionVersion: 99,
      });

      expect(res.status).toBe(400);
    });

    it("refuses an operator object where a string is expected", async () => {
      // The classic NoSQL injection shape: { "$ne": null } as an email.
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: { $ne: null }, password: { $ne: null } });

      expect(res.status).toBe(400);
    });

    it("normalises email casing and whitespace", async () => {
      await createAttendee({ email: "casing@example.test" });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "  CASING@Example.TEST ", password: DEFAULT_PASSWORD });

      expect(res.status).toBe(200);
    });
  });

  describe("bookings", () => {
    it("rejects an invalid event id before touching the database", async () => {
      await createAttendee({ email: "badid@example.test" });
      const agent = await loginAgent(app, "badid@example.test");

      const res = await agent
        .post("/api/bookings")
        .send({ eventId: "not-an-object-id", seats: [{ x: 0, y: 0 }] });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
    });

    it("rejects an empty seat selection", async () => {
      const { event } = await createEventWithSeatMap();
      await createAttendee({ email: "noseats@example.test" });
      const agent = await loginAgent(app, "noseats@example.test");

      const res = await agent
        .post("/api/bookings")
        .send({ eventId: String(event._id), seats: [] });

      expect(res.status).toBe(400);
    });

    it("rejects non-integer and negative coordinates", async () => {
      const { event } = await createEventWithSeatMap();
      await createAttendee({ email: "coords@example.test" });
      const agent = await loginAgent(app, "coords@example.test");

      for (const seats of [[{ x: 1.5, y: 0 }], [{ x: -1, y: 0 }]]) {
        const res = await agent
          .post("/api/bookings")
          .send({ eventId: String(event._id), seats });
        expect(res.status).toBe(400);
      }
    });

    it("rejects an absurd seat count without opening a transaction", async () => {
      const { event } = await createEventWithSeatMap();
      await createAttendee({ email: "flood@example.test" });
      const agent = await loginAgent(app, "flood@example.test");

      const seats = Array.from({ length: MAX_SEATS_PER_BOOKING * 10 }, (_, i) => ({
        x: i,
        y: 0,
      }));

      const res = await agent
        .post("/api/bookings")
        .send({ eventId: String(event._id), seats });

      expect(res.status).toBe(400);
      await expect(BookingModel.countDocuments()).resolves.toBe(0);
    });

    it("rejects a malformed booking id in the path", async () => {
      await createAttendee({ email: "pathid@example.test" });
      const agent = await loginAgent(app, "pathid@example.test");

      const res = await agent.delete("/api/bookings/not-an-id");

      expect(res.status).toBe(400);
    });
  });

  describe("events", () => {
    const validEvent = () => ({
      title: "A Show",
      description: "Something happens.",
      categories: ["music"],
      venueType: "custom" as const,
      venueName: "The Hall",
      venueAddress: "1 Street",
      startTime: new Date(Date.now() + 86_400_000).toISOString(),
      endTime: new Date(Date.now() + 90_000_000).toISOString(),
    });

    const organizerAgent = async (email: string) => {
      await createOrganizer({ email });
      return loginAgent(app, email);
    };

    it("rejects an end time before the start time", async () => {
      const agent = await organizerAgent("times@example.test");

      const res = await agent.post("/api/events").send({
        ...validEvent(),
        startTime: new Date(Date.now() + 90_000_000).toISOString(),
        endTime: new Date(Date.now() + 86_400_000).toISOString(),
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/before endTime/i);
    });

    it("requires a venue name and address for a custom venue", async () => {
      const agent = await organizerAgent("venue@example.test");

      const { venueName, venueAddress, ...rest } = validEvent();
      void venueName;
      void venueAddress;

      const res = await agent.post("/api/events").send(rest);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/venueName/i);
    });

    it("requires a template venue id for a template venue", async () => {
      const agent = await organizerAgent("template@example.test");

      const res = await agent
        .post("/api/events")
        .send({ ...validEvent(), venueType: "template" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/templateVenueId/i);
    });

    it("refuses an organizerId supplied by the client", async () => {
      const agent = await organizerAgent("owner@example.test");

      // Ownership comes from the session; accepting it from the body would let
      // one organizer create an event owned by another.
      const res = await agent
        .post("/api/events")
        .send({ ...validEvent(), organizerId: String(new Types.ObjectId()) });

      expect(res.status).toBe(400);
      await expect(eventModel.countDocuments()).resolves.toBe(0);
    });

    it("rejects a bad id in the path", async () => {
      const res = await request(app).get("/api/events/not-an-id");
      expect(res.status).toBe(400);
    });

    it("accepts a valid event", async () => {
      const agent = await organizerAgent("good@example.test");

      const res = await agent.post("/api/events").send(validEvent());

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("A Show");
      // Defaults applied by the schema.
      expect(res.body.status).toBe("draft");
    });

    it("trims whitespace it accepts", async () => {
      const agent = await organizerAgent("trim@example.test");

      const res = await agent
        .post("/api/events")
        .send({ ...validEvent(), title: "   Padded Title   " });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("Padded Title");
    });
  });
});
