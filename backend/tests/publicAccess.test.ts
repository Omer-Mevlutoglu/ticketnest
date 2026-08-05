import type { Express } from "express";
import { Types } from "mongoose";
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import {
  createAttendee,
  createEvent,
  createEventWithSeatMap,
  createOrganizer,
} from "./factories";
import { buildTestApp, loginAgent } from "./helpers";

/**
 * WP3.1 — anyone can discover events; authentication starts at seat selection.
 *
 * The second half matters as much as the first: opening browsing must not open
 * anything an organizer has not published.
 */
describe("WP3.1 — public event discovery", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  describe("anonymous browsing", () => {
    it("lists published events", async () => {
      await createEvent({ title: "Public Show", status: "published" });

      const res = await request(app).get("/api/events");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("Public Show");
      expect(res.body).toMatchObject({ total: 1, page: 1, pageCount: 1 });
    });

    it("opens a published event by id", async () => {
      const event = await createEvent({ title: "Openable" });

      const res = await request(app).get(`/api/events/${event._id}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Openable");
    });

    it("reads the seat map of a published event", async () => {
      const { event } = await createEventWithSeatMap({}, { rows: 2, cols: 2 });

      const res = await request(app).get(`/api/events/${event._id}/seatmap`);

      expect(res.status).toBe(200);
      expect(res.body.seats).toHaveLength(4);
    });

    it("does not expose who holds a seat", async () => {
      const { event } = await createEventWithSeatMap();

      const res = await request(app).get(`/api/events/${event._id}/seatmap`);

      for (const seat of res.body.seats) {
        expect(seat.reservedBy).toBeUndefined();
      }
    });
  });

  describe("what stays hidden", () => {
    it.each(["draft", "archived"] as const)(
      "does not list %s events",
      async (status) => {
        await createEvent({ status });
        await createEvent({ status: "published", title: "Visible" });

        const res = await request(app).get("/api/events");

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].title).toBe("Visible");
      }
    );

    it("does not list cancelled events", async () => {
      await createEvent({ isCancelled: true });

      const res = await request(app).get("/api/events");

      expect(res.body.data).toHaveLength(0);
      expect(res.body.total).toBe(0);
    });

    it.each(["draft", "archived"] as const)(
      "returns 404 for a %s event by id",
      async (status) => {
        const event = await createEvent({ status });

        const res = await request(app).get(`/api/events/${event._id}`);

        expect(res.status).toBe(404);
      }
    );

    it("returns 404 for a cancelled event by id", async () => {
      const event = await createEvent({ isCancelled: true });

      const res = await request(app).get(`/api/events/${event._id}`);

      expect(res.status).toBe(404);
    });

    it("does not leak the seat map of an unpublished event", async () => {
      const { event } = await createEventWithSeatMap({ status: "draft" });

      const res = await request(app).get(`/api/events/${event._id}/seatmap`);

      expect(res.status).toBe(404);
    });

    it("returns 404, not 403, so an id cannot be probed", async () => {
      const draft = await createEvent({ status: "draft" });
      const missing = new Types.ObjectId();

      const known = await request(app).get(`/api/events/${draft._id}`);
      const unknown = await request(app).get(`/api/events/${missing}`);

      expect(known.status).toBe(unknown.status);
    });
  });

  describe("where authentication starts", () => {
    it("refuses an anonymous seat reservation", async () => {
      const { event } = await createEventWithSeatMap();

      const res = await request(app)
        .post("/api/bookings")
        .send({ eventId: String(event._id), seats: [{ x: 0, y: 0 }] });

      expect(res.status).toBe(401);
    });

    it("refuses anonymous access to bookings and favorites", async () => {
      for (const path of ["/api/bookings", "/api/favorites"]) {
        await expect(
          request(app).get(path).then((r) => r.status)
        ).resolves.toBe(401);
      }
    });

    it("lets a signed-in attendee reserve the seat they browsed to", async () => {
      const { event } = await createEventWithSeatMap();
      await createAttendee({ email: "browser@example.test" });

      // Anonymous first — the same journey a visitor takes.
      await expect(
        request(app).get(`/api/events/${event._id}`).then((r) => r.status)
      ).resolves.toBe(200);

      const agent = await loginAgent(app, "browser@example.test");
      const res = await agent
        .post("/api/bookings")
        .send({ eventId: String(event._id), seats: [{ x: 0, y: 0 }] });

      expect(res.status).toBe(201);
    });
  });

  describe("other roles are unaffected", () => {
    it("still gates the organizer's own event list", async () => {
      await expect(
        request(app).get("/api/events/mine").then((r) => r.status)
      ).resolves.toBe(401);
    });

    it("still lets an approved organizer reach their events", async () => {
      const { user } = await createOrganizer({ email: "org@example.test" });
      await createEvent({
        organizerId: user._id as Types.ObjectId,
        title: "Mine",
        status: "draft",
      });

      const agent = await loginAgent(app, "org@example.test");
      const res = await agent.get("/api/events/mine");

      expect(res.status).toBe(200);
      // Drafts are hidden publicly but visible to their owner.
      expect(res.body.data).toHaveLength(1);
    });

    it("keeps admin routes closed to attendees", async () => {
      await createAttendee({ email: "nosy@example.test" });
      const agent = await loginAgent(app, "nosy@example.test");

      await expect(
        agent.get("/api/admin/users").then((r) => r.status)
      ).resolves.toBe(403);
    });
  });
});
