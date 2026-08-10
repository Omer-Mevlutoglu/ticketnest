import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { buildTestApp, loginAgent } from "./helpers";
import { createAttendee, DEFAULT_PASSWORD } from "./factories";

describe("API harness — session authentication", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Unauthorized");
  });

  it("logs in and keeps the session across requests", async () => {
    const { user } = await createAttendee({ email: "session@example.test" });

    const agent = await loginAgent(app, "session@example.test");
    const res = await agent.get("/api/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(String(user._id));
    expect(res.body.user.email).toBe("session@example.test");
    expect(res.body.user.role).toBe("attendee");
  });

  it("refuses a login with the wrong password", async () => {
    await createAttendee({ email: "wrongpw@example.test" });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "wrongpw@example.test", password: "not-the-password" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("uses the same login response for an unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "missing@example.test", password: "not-the-password" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("refuses a login for an unverified email", async () => {
    await createAttendee({
      email: "unverified@example.test",
      emailVerified: false,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "unverified@example.test", password: DEFAULT_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("uses the same login response for a suspended account", async () => {
    await createAttendee({
      email: "suspended@example.test",
      isSuspended: true,
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "suspended@example.test", password: DEFAULT_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password.");
  });

  it("keeps sessions isolated between agents", async () => {
    await createAttendee({ email: "first@example.test" });
    await createAttendee({ email: "second@example.test" });

    const first = await loginAgent(app, "first@example.test");
    const second = await loginAgent(app, "second@example.test");

    const firstMe = await first.get("/api/auth/me");
    const secondMe = await second.get("/api/auth/me");

    expect(firstMe.body.user.email).toBe("first@example.test");
    expect(secondMe.body.user.email).toBe("second@example.test");
  });
});
