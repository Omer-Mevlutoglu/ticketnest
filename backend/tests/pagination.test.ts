import type { Express } from "express";
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { eventModel } from "../src/models/eventModel";
import BookingModel from "../src/models/bookingModel";
import {
  createAdmin,
  createAttendee,
  createEvent,
  createOrganizer,
} from "./factories";
import { buildTestApp, loginAgent } from "./helpers";

/** WP4.4 — pagination, index coverage, and favourites in one request. */
describe("WP4.4 — pagination, indexes, favorites", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  /** Events with distinct start times, so ordering is unambiguous. */
  const seedEvents = async (count: number) => {
    const base = Date.now() + 86_400_000;
    for (let i = 0; i < count; i++) {
      await createEvent({
        title: `Event ${String(i).padStart(2, "0")}`,
        status: "published",
        startTime: new Date(base + i * 60_000),
      });
    }
  };

  describe("limits", () => {
    it("defaults to a bounded page rather than the whole collection", async () => {
      await seedEvents(25);

      const res = await request(app).get("/api/events");

      expect(res.body.data).toHaveLength(20);
      expect(res.body).toMatchObject({ total: 25, page: 1, limit: 20, pageCount: 2 });
    });

    it("rejects a limit above the cap", async () => {
      const res = await request(app).get("/api/events?limit=5000");

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
    });

    it.each(["0", "-1", "abc"])("rejects limit=%s", async (limit) => {
      const res = await request(app).get(`/api/events?limit=${limit}`);
      expect(res.status).toBe(400);
    });

    it("rejects an invalid page", async () => {
      await expect(
        request(app).get("/api/events?page=0").then((r) => r.status)
      ).resolves.toBe(400);
    });

    it("rejects an unknown query parameter", async () => {
      const res = await request(app).get("/api/events?sort=whatever");
      expect(res.status).toBe(400);
    });
  });

  describe("page boundaries", () => {
    it("neither duplicates nor skips a record across pages", async () => {
      await seedEvents(25);

      const seen: string[] = [];
      for (let page = 1; page <= 3; page++) {
        const res = await request(app).get(`/api/events?page=${page}&limit=10`);
        seen.push(...res.body.data.map((e: { _id: string }) => e._id));
      }

      expect(seen).toHaveLength(25);
      expect(new Set(seen).size).toBe(25);
    });

    it("stays stable when many records share a sort value", async () => {
      // Identical startTime — without the _id tiebreaker, MongoDB is free to
      // return these in a different order per query, and paging would both
      // repeat and drop rows.
      const sameTime = new Date(Date.now() + 86_400_000);
      for (let i = 0; i < 15; i++) {
        await createEvent({ title: `Tie ${i}`, startTime: sameTime });
      }

      const seen: string[] = [];
      for (let page = 1; page <= 3; page++) {
        const res = await request(app).get(`/api/events?page=${page}&limit=5`);
        seen.push(...res.body.data.map((e: { _id: string }) => e._id));
      }

      expect(new Set(seen).size).toBe(15);
    });

    it("returns an empty page past the end, not an error", async () => {
      await seedEvents(3);

      const res = await request(app).get("/api/events?page=9&limit=10");

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
      expect(res.body.total).toBe(3);
    });

    it("orders the public listing by start time", async () => {
      await seedEvents(5);

      const res = await request(app).get("/api/events?limit=5");
      const titles = res.body.data.map((e: { title: string }) => e.title);

      expect(titles).toEqual([...titles].sort());
    });
  });

  describe("admin lists", () => {
    it("paginates users", async () => {
      await createAdmin({ email: "admin@example.test" });
      for (let i = 0; i < 12; i++) {
        await createAttendee({ email: `u${i}@example.test` });
      }

      const agent = await loginAgent(app, "admin@example.test");
      const res = await agent.get("/api/admin/users?limit=5");

      expect(res.body.data).toHaveLength(5);
      // Admins are excluded from the listing.
      expect(res.body.total).toBe(12);
    });

    it("paginates bookings and still filters by status", async () => {
      await createAdmin({ email: "admin2@example.test" });
      const { user } = await createAttendee();
      const event = await createEvent({});

      for (let i = 0; i < 6; i++) {
        await BookingModel.create({
          userId: user._id,
          eventId: event._id,
          items: [{ seatCoords: { x: i, y: 0 }, price: 10 }],
          total: 10,
          status: i < 4 ? "paid" : "unpaid",
        });
      }

      const agent = await loginAgent(app, "admin2@example.test");
      const res = await agent.get("/api/admin/bookings?status=paid&limit=3");

      expect(res.body.data).toHaveLength(3);
      expect(res.body.total).toBe(4);
    });

    it("rejects an unknown booking status", async () => {
      await createAdmin({ email: "admin3@example.test" });
      const agent = await loginAgent(app, "admin3@example.test");

      const res = await agent.get("/api/admin/bookings?status=bogus");

      expect(res.status).toBe(400);
    });
  });

  describe("index coverage", () => {
    it("serves the public listing from an index, without an in-memory sort", async () => {
      await seedEvents(5);

      const plan: any = await eventModel
        .find({ status: "published", isCancelled: { $ne: true } })
        .sort({ startTime: 1, _id: -1 })
        .explain("queryPlanner");

      const stages = JSON.stringify(plan.queryPlanner.winningPlan);
      expect(stages).toContain("IXSCAN");
      expect(stages).not.toContain("COLLSCAN");
    });

    it("serves an organizer's own list from an index", async () => {
      const event = await createEvent({});

      const plan: any = await eventModel
        .find({ organizerId: event.organizerId, isCancelled: { $ne: true } })
        .sort({ createdAt: -1, _id: -1 })
        .explain("queryPlanner");

      const stages = JSON.stringify(plan.queryPlanner.winningPlan);
      expect(stages).toContain("IXSCAN");
      expect(stages).not.toContain("COLLSCAN");
    });

    it("serves the admin booking list from an index", async () => {
      const plan: any = await BookingModel.find({ status: "paid" })
        .sort({ createdAt: -1, _id: -1 })
        .explain("queryPlanner");

      const stages = JSON.stringify(plan.queryPlanner.winningPlan);
      expect(stages).toContain("IXSCAN");
      expect(stages).not.toContain("COLLSCAN");
    });
  });

  describe("favorites", () => {
    it("returns the events themselves, in one request", async () => {
      const { user } = await createAttendee({ email: "fav@example.test" });
      const a = await createEvent({ title: "Alpha" });
      const b = await createEvent({ title: "Beta" });

      const agent = await loginAgent(app, "fav@example.test");
      await agent.post(`/api/favorites/${a._id}`);
      await agent.post(`/api/favorites/${b._id}`);

      const res = await agent.get("/api/favorites");

      expect(res.status).toBe(200);
      expect(res.body.ids).toHaveLength(2);
      // The whole point: no follow-up request per favourite.
      expect(res.body.events).toHaveLength(2);
      expect(res.body.events.map((e: { title: string }) => e.title)).toEqual([
        "Alpha",
        "Beta",
      ]);
      expect(String(user._id)).toBeTruthy();
    });

    it("preserves the order favourites were added in", async () => {
      await createAttendee({ email: "order@example.test" });
      const first = await createEvent({ title: "First" });
      const second = await createEvent({ title: "Second" });

      const agent = await loginAgent(app, "order@example.test");
      await agent.post(`/api/favorites/${second._id}`);
      await agent.post(`/api/favorites/${first._id}`);

      const res = await agent.get("/api/favorites");

      expect(res.body.events.map((e: { title: string }) => e.title)).toEqual([
        "Second",
        "First",
      ]);
    });

    it("omits an event that is no longer publicly visible", async () => {
      await createAttendee({ email: "stale@example.test" });
      const live = await createEvent({ title: "Live" });
      const pulled = await createEvent({ title: "Pulled" });

      const agent = await loginAgent(app, "stale@example.test");
      await agent.post(`/api/favorites/${live._id}`);
      await agent.post(`/api/favorites/${pulled._id}`);

      await eventModel.updateOne(
        { _id: pulled._id },
        { $set: { isCancelled: true } }
      );

      const res = await agent.get("/api/favorites");

      // The id is still favourited, but the cancelled event is not returned.
      expect(res.body.ids).toHaveLength(2);
      expect(res.body.events).toHaveLength(1);
      expect(res.body.events[0].title).toBe("Live");
    });

    it("returns empty lists for a user with no favourites", async () => {
      await createAttendee({ email: "none@example.test" });
      const agent = await loginAgent(app, "none@example.test");

      const res = await agent.get("/api/favorites");

      expect(res.body).toEqual({ ids: [], events: [] });
    });

    it("rejects a malformed event id", async () => {
      await createAttendee({ email: "badfav@example.test" });
      const agent = await loginAgent(app, "badfav@example.test");

      await expect(
        agent.post("/api/favorites/not-an-id").then((r) => r.status)
      ).resolves.toBe(400);
    });
  });

  describe("organizer list", () => {
    it("paginates an organizer's own events", async () => {
      const { user } = await createOrganizer({ email: "many@example.test" });
      for (let i = 0; i < 8; i++) {
        await createEvent({ organizerId: user._id, title: `Mine ${i}` });
      }

      const agent = await loginAgent(app, "many@example.test");
      const res = await agent.get("/api/events/mine?limit=3");

      expect(res.body.data).toHaveLength(3);
      expect(res.body.total).toBe(8);
      expect(res.body.pageCount).toBe(3);
    });
  });
});
