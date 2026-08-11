import type { Express } from "express";
import { Types } from "mongoose";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import userModel from "../src/models/userModel";
import {
  createAdmin,
  createAttendee,
  createEventWithSeatMap,
  createOrganizer,
} from "./factories";
import { buildTestApp, loginAgent } from "./helpers";

describe("hosted demo policy", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  afterEach(() => {
    process.env.DEMO_MODE = "false";
  });

  it("blocks every organizer write with a stable code, including new organizers", async () => {
    process.env.DEMO_MODE = "true";
    const { user } = await createOrganizer();
    const agent = await loginAgent(app, user.email);

    const response = await agent.post("/api/events").send({});

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("DEMO_RESTRICTED");

    const upload = await agent.post("/api/organizer/uploads/poster");
    expect(upload.status).toBe(403);
    expect(upload.body.code).toBe("DEMO_RESTRICTED");
  });

  it("covers every organizer management endpoint", async () => {
    process.env.DEMO_MODE = "true";
    const { user } = await createOrganizer();
    const agent = await loginAgent(app, user.email);
    const id = new Types.ObjectId();
    const responses = await Promise.all([
      agent.put(`/api/events/${id}`).send({}),
      agent.delete(`/api/events/${id}`),
      agent.put(`/api/events/${id}/seatmap`).send({}),
      agent.post(`/api/events/${id}/seatmap/generate`).send({}),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body.code).toBe("DEMO_RESTRICTED");
    }
  });

  it("allows organizer writes when demo mode is off", async () => {
    const { user } = await createOrganizer();
    const agent = await loginAgent(app, user.email);
    const startTime = new Date(Date.now() + 86_400_000);

    const response = await agent.post("/api/events").send({
      title: "Locally managed event",
      description: "Normal mode keeps the complete workflow available.",
      categories: ["test"],
      status: "draft",
      venueType: "custom",
      venueName: "Test Hall",
      venueAddress: "1 Test Street",
      startTime,
      endTime: new Date(startTime.getTime() + 3_600_000),
    });

    expect(response.status).toBe(201);
  });

  it("lets only trusted system admins perform management writes in demo mode", async () => {
    process.env.DEMO_MODE = "true";
    const { user: demoAdmin } = await createAdmin({ isDemoAccount: true });
    const { user: systemAdmin } = await createAdmin({ isSystemAdmin: true });
    const demoAgent = await loginAgent(app, demoAdmin.email);
    const systemAgent = await loginAgent(app, systemAdmin.email);
    const venue = {
      name: "Protected Venue",
      address: "1 Demo Street",
      description: "A venue created by a trusted admin.",
      capacity: 10,
      defaultLayoutType: "grid",
      defaultSeatMap: [],
      isActive: true,
    };

    const blocked = await demoAgent.post("/api/admin/venues").send(venue);
    const allowed = await systemAgent.post("/api/admin/venues").send(venue);

    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("DEMO_RESTRICTED");
    expect(allowed.status).toBe(201);
  });

  it("covers every demo-admin management endpoint", async () => {
    process.env.DEMO_MODE = "true";
    const { user } = await createAdmin({ isDemoAccount: true });
    const agent = await loginAgent(app, user.email);
    const id = new Types.ObjectId();
    const responses = await Promise.all([
      agent.put(`/api/admin/users/${id}/set-approval`).send({}),
      agent.put(`/api/admin/users/${id}/suspend`).send({}),
      agent.put(`/api/admin/users/${id}/unsuspend`).send({}),
      agent.put(`/api/admin/organizers/${id}/approve`).send({}),
      agent.put(`/api/admin/organizers/${id}/reject`).send({}),
      agent.put(`/api/admin/venues/${id}`).send({}),
      agent.delete(`/api/admin/venues/${id}`),
      agent.post("/api/admin/uploads/venue-images"),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(403);
      expect(response.body.code).toBe("DEMO_RESTRICTED");
    }
  });

  it("keeps attendee booking writes available in demo mode", async () => {
    process.env.DEMO_MODE = "true";
    const { user } = await createAttendee();
    const { event } = await createEventWithSeatMap();
    const agent = await loginAgent(app, user.email);

    const response = await agent.post("/api/bookings").send({
      eventId: event._id,
      seats: [{ x: 0, y: 0 }],
    });

    expect(response.status).toBe(201);
  });

  it("masks visitor identities for the public demo admin but not a trusted admin", async () => {
    process.env.DEMO_MODE = "true";
    const { user: demoAdmin } = await createAdmin({
      email: "admin@demo.ticketnest",
      isDemoAccount: true,
    });
    const { user: systemAdmin } = await createAdmin({ isSystemAdmin: true });
    const { user: visitor } = await createAttendee({
      username: "Private Person",
      email: "private.person@example.test",
    });
    const demoAgent = await loginAgent(app, demoAdmin.email);
    const systemAgent = await loginAgent(app, systemAdmin.email);

    const masked = await demoAgent.get("/api/admin/users?limit=100");
    const unmasked = await systemAgent.get("/api/admin/users?limit=100");
    const maskedVisitor = masked.body.data.find((entry: { email: string }) =>
      entry.email.endsWith("@private.invalid")
    );
    const realVisitor = unmasked.body.data.find(
      (entry: { _id: string }) => entry._id === String(visitor._id)
    );

    expect(masked.status).toBe(200);
    expect(maskedVisitor.email).toMatch(/@private\.invalid$/);
    expect(maskedVisitor._id).toMatch(/^demo-visitor-/);
    expect(maskedVisitor.username).toMatch(/^Demo visitor /);
    expect(maskedVisitor).not.toHaveProperty("isSystemAdmin");
    expect(maskedVisitor).not.toHaveProperty("isDemoAccount");
    expect(realVisitor.email).toBe("private.person@example.test");
  });

  it("does not let registration set trust markers", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "marker-attempt",
      email: "marker@example.test",
      password: "Password123",
      role: "organizer",
      isSystemAdmin: true,
    });

    expect(response.status).toBe(400);
    await expect(userModel.countDocuments({ email: "marker@example.test" })).resolves.toBe(0);
  });
});
