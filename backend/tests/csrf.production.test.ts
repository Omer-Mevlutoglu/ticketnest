import type { Express } from "express";
import request, { Response } from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetConfigCache } from "../src/configs/env";
import { createAttendee, DEFAULT_PASSWORD } from "./factories";
import { buildTestApp } from "./helpers";

const PRODUCTION_ORIGIN = "https://ticketnest.example";

const cookieHeader = (response: Response): string => {
  const values = response.headers["set-cookie"] as unknown as
    | string[]
    | undefined;
  return (values ?? []).map((value) => value.split(";", 1)[0]).join("; ");
};

describe("production CSRF session flow", () => {
  let app: Express;
  const original = {
    NODE_ENV: process.env.NODE_ENV,
    MONGO_URI: process.env.MONGO_URI,
    SESSION_SECRET: process.env.SESSION_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL,
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    ENABLE_EMAIL: process.env.ENABLE_EMAIL,
  };

  beforeAll(() => {
    process.env.NODE_ENV = "production";
    process.env.MONGO_URI = process.env.TEST_MONGO_URI;
    process.env.SESSION_SECRET = "production-test-session-secret";
    process.env.FRONTEND_URL = PRODUCTION_ORIGIN;
    process.env.CORS_ORIGINS = PRODUCTION_ORIGIN;
    process.env.ENABLE_EMAIL = "false";
    resetConfigCache();
    app = buildTestApp();
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetConfigCache();
  });

  const csrfSession = async () => {
    const tokenResponse = await request(app)
      .get("/api/csrf-token")
      .set("X-Forwarded-Proto", "https");
    const cookies = cookieHeader(tokenResponse);

    expect(tokenResponse.status).toBe(200);
    expect(tokenResponse.body.csrfToken).toEqual(expect.any(String));
    expect(cookies).toContain("connect.sid=");
    expect(cookies).toContain("tn.x-csrf-token=");

    return { token: tokenResponse.body.csrfToken as string, cookies };
  };

  it("registers with the persisted session that signed the token", async () => {
    const { token, cookies } = await csrfSession();

    const response = await request(app)
      .post("/api/auth/register")
      .set("Cookie", cookies)
      .set("X-Forwarded-Proto", "https")
      .set("Origin", PRODUCTION_ORIGIN)
      .set("x-csrf-token", token)
      .send({
        username: "production-csrf-register",
        email: "production-register@example.test",
        password: "password123",
        role: "attendee",
      });

    expect(response.status).toBe(201);
  });

  it("logs in with the persisted session that signed the token", async () => {
    await createAttendee({ email: "production-login@example.test" });
    const { token, cookies } = await csrfSession();

    const response = await request(app)
      .post("/api/auth/login")
      .set("Cookie", cookies)
      .set("X-Forwarded-Proto", "https")
      .set("Origin", PRODUCTION_ORIGIN)
      .set("x-csrf-token", token)
      .send({
        email: "production-login@example.test",
        password: DEFAULT_PASSWORD,
      });

    expect(response.status).toBe(200);
    expect(cookieHeader(response)).toContain("connect.sid=");
  });

  it("returns a stable 403 for a missing token", async () => {
    const { cookies } = await csrfSession();

    const response = await request(app)
      .post("/api/auth/login")
      .set("Cookie", cookies)
      .set("X-Forwarded-Proto", "https")
      .set("Origin", PRODUCTION_ORIGIN)
      .send({ email: "nobody@example.test", password: "password123" });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      message: "Invalid or missing CSRF token.",
      code: "CSRF_INVALID",
    });
  });

  it("returns the same stable 403 for a mismatched token", async () => {
    const first = await csrfSession();
    const second = await csrfSession();

    const response = await request(app)
      .post("/api/auth/login")
      .set("Cookie", first.cookies)
      .set("X-Forwarded-Proto", "https")
      .set("Origin", PRODUCTION_ORIGIN)
      .set("x-csrf-token", second.token)
      .send({ email: "nobody@example.test", password: "password123" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CSRF_INVALID");
  });
});
