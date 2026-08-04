import type { Express } from "express";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createAttendee, DEFAULT_PASSWORD } from "./factories";
import { buildTestApp, loginAgent } from "./helpers";

/** WP2.3 — headers, origin validation, and per-endpoint rate limits. */
describe("WP2.3 — security middleware", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  afterEach(() => {
    process.env.DISABLE_RATE_LIMITS = "true";
  });

  describe("security headers", () => {
    it("sets the headers helmet is here for", async () => {
      const res = await request(app).get("/api/config");

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBeDefined();
      expect(res.headers["strict-transport-security"]).toBeDefined();
    });

    it("does not advertise Express", async () => {
      const res = await request(app).get("/api/config");
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });
  });

  describe("origin validation", () => {
    it("allows a write from an allowed origin", async () => {
      await createAttendee({ email: "goodorigin@example.test" });

      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", "http://localhost:5173")
        .send({ email: "goodorigin@example.test", password: DEFAULT_PASSWORD });

      expect(res.status).toBe(200);
    });

    it("rejects a write from an unknown origin", async () => {
      await createAttendee({ email: "badorigin@example.test" });

      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", "https://evil.example")
        .send({ email: "badorigin@example.test", password: DEFAULT_PASSWORD });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("ORIGIN_NOT_ALLOWED");
    });

    it("falls back to Referer when Origin is absent", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Referer", "https://evil.example/checkout")
        .send({ email: "x@example.test", password: "irrelevant" });

      expect(res.status).toBe(403);
    });

    it("does not interfere with reads", async () => {
      const res = await request(app)
        .get("/api/config")
        .set("Origin", "https://evil.example");

      expect(res.status).toBe(200);
    });

    it("allows a request with no Origin and no Referer", async () => {
      // Server-to-server callers and health checks look like this, and they
      // carry no ambient cookie for an attacker to ride on.
      await createAttendee({ email: "noorigin@example.test" });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "noorigin@example.test", password: DEFAULT_PASSWORD });

      expect(res.status).toBe(200);
    });
  });

  describe("csrf token endpoint", () => {
    it("issues a token", async () => {
      const res = await request(app).get("/api/csrf-token");

      expect(res.status).toBe(200);
      expect(typeof res.body.csrfToken).toBe("string");
      expect(res.body.csrfToken.length).toBeGreaterThan(0);
    });
  });

  describe("rate limits", () => {
    it("throttles repeated login attempts", async () => {
      await createAttendee({ email: "throttle@example.test" });
      process.env.DISABLE_RATE_LIMITS = "false";

      const attempt = () =>
        request(app)
          .post("/api/auth/login")
          .send({ email: "throttle@example.test", password: "wrong-password" });

      let limited: number | null = null;
      for (let i = 0; i < 15; i++) {
        const res = await attempt();
        if (res.status === 429) {
          limited = i;
          expect(res.body.code).toBe("RATE_LIMITED");
          break;
        }
      }

      expect(limited).not.toBeNull();
      // The limit is 10 per window, so it must not trip earlier than that.
      expect(limited!).toBeGreaterThanOrEqual(10);
    });

    it("gives the same response whether or not the account exists", async () => {
      process.env.DISABLE_RATE_LIMITS = "false";

      const hitLimit = async (email: string) => {
        let last;
        for (let i = 0; i < 15; i++) {
          last = await request(app)
            .post("/api/auth/login")
            .send({ email, password: "wrong-password" });
          if (last.status === 429) return last;
        }
        return last!;
      };

      await createAttendee({ email: "real@example.test" });
      const real = await hitLimit("real@example.test");
      const fake = await hitLimit("nobody@example.test");

      expect(real.status).toBe(429);
      expect(fake.status).toBe(429);
      expect(fake.body).toEqual(real.body);
    });

    it("does not throttle ordinary authenticated reads", async () => {
      await createAttendee({ email: "browsing@example.test" });
      const agent = await loginAgent(app, "browsing@example.test");
      process.env.DISABLE_RATE_LIMITS = "false";

      for (let i = 0; i < 25; i++) {
        const res = await agent.get("/api/auth/me");
        expect(res.status).toBe(200);
      }
    });
  });
});
