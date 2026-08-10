import type { Express } from "express";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import userModel from "../src/models/userModel";
import { loadConfig } from "../src/configs/env";
import { buildTestApp } from "./helpers";

const sendgrid = vi.hoisted(() => ({
  send: vi.fn(),
  setApiKey: vi.fn(),
}));

vi.mock("@sendgrid/mail", () => ({ default: sendgrid }));

/**
 * ENABLE_EMAIL — the project must run end to end with no email provider.
 *
 * The trap this closes: the login strategy refuses unverified accounts, so
 * switching email off without auto-verifying at signup would make every new
 * account permanently unusable.
 */
describe("ENABLE_EMAIL", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  beforeEach(() => {
    sendgrid.send.mockReset();
    sendgrid.send.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.ENABLE_EMAIL = "false";
  });

  const signUp = (email: string) =>
    request(app).post("/api/auth/register").send({
      username: email.split("@")[0],
      email,
      password: "password123",
      role: "attendee",
    });

  describe("when off (the default)", () => {
    it("defaults to off with no configuration at all", () => {
      const env = { NODE_ENV: "development" } as NodeJS.ProcessEnv;
      expect(loadConfig(env).emailEnabled).toBe(false);
    });

    it("reports itself through /api/config", async () => {
      const res = await request(app).get("/api/config");
      expect(res.body.emailEnabled).toBe(false);
    });

    it("verifies a new account immediately", async () => {
      const res = await signUp("offmode@example.test");

      expect(res.status).toBe(201);
      const user = await userModel.findOne({ email: "offmode@example.test" }).lean();
      expect(user!.emailVerified).toBe(true);
    });

    it("tells the client no verification email was sent", async () => {
      const res = await signUp("noemail@example.test");
      expect(res.body.user.verificationEmailSent).toBe(false);
      expect(res.body.user.emailVerificationRequired).toBe(false);
      expect(sendgrid.send).not.toHaveBeenCalled();
    });

    it("lets the new account sign in straight away", async () => {
      // This is the whole point: without auto-verification the account would
      // be created and then permanently locked out.
      await signUp("cansignin@example.test");

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "cansignin@example.test", password: "password123" });

      expect(res.status).toBe(200);
    });

    it("still holds organizers for approval", async () => {
      await request(app).post("/api/auth/register").send({
        username: "org-off",
        email: "orgoff@example.test",
        password: "password123",
        role: "organizer",
      });

      const user = await userModel.findOne({ email: "orgoff@example.test" }).lean();
      // Verified, but approval is a separate gate and stays closed.
      expect(user!.emailVerified).toBe(true);
      expect(user!.isApproved).toBe(false);
    });

    it("refuses password reset with a clear reason", async () => {
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "someone@example.test" });

      expect(res.status).toBe(503);
      expect(res.body.code).toBe("EMAIL_DISABLED");
    });

    it("does not require email credentials to boot in production", () => {
      const env = {
        NODE_ENV: "production",
        MONGO_URI: "mongodb://db/ticketnest",
        SESSION_SECRET: "a-real-production-secret",
        FRONTEND_URL: "https://ticketnest.example",
        CORS_ORIGINS: "https://ticketnest.example",
        EMAIL_VERIFY_TOKEN_SECRET: "verify",
        PASSWORD_RESET_TOKEN_SECRET: "reset",
      } as NodeJS.ProcessEnv;

      expect(() => loadConfig(env)).not.toThrow();
    });
  });

  describe("when on", () => {
    const withEmailOn = () => {
      process.env.ENABLE_EMAIL = "true";
    };

    it("reports itself through /api/config", async () => {
      withEmailOn();
      const res = await request(app).get("/api/config");
      expect(res.body.emailEnabled).toBe(true);
    });

    it("leaves a new account unverified", async () => {
      withEmailOn();
      const res = await signUp("onmode@example.test");

      const user = await userModel.findOne({ email: "onmode@example.test" }).lean();
      expect(user!.emailVerified).toBe(false);
      expect(res.body.user.emailVerificationRequired).toBe(true);
      expect(res.body.user.verificationEmailSent).toBe(true);
      expect(sendgrid.send).toHaveBeenCalledOnce();
    });

    it("blocks sign-in until the address is verified", async () => {
      withEmailOn();
      await signUp("unverified@example.test");

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "unverified@example.test", password: "password123" });

      expect(res.status).toBe(401);
    });

    it("creates the account even when delivery fails", async () => {
      sendgrid.send.mockRejectedValueOnce(new Error("provider unavailable"));
      withEmailOn();
      const res = await signUp("delivery@example.test");

      expect(res.status).toBe(201);
      expect(res.body.user.emailVerificationRequired).toBe(true);
      expect(res.body.user.verificationEmailSent).toBe(false);
      expect(res.body.message).toMatch(/could not be sent/i);
      await expect(
        userModel.countDocuments({ email: "delivery@example.test" })
      ).resolves.toBe(1);
    });

    it("resends verification without revealing whether the account exists", async () => {
      withEmailOn();
      await signUp("resend@example.test");
      sendgrid.send.mockClear();

      const known = await request(app)
        .post("/api/auth/resend-verification")
        .send({ email: "resend@example.test" });
      const unknown = await request(app)
        .post("/api/auth/resend-verification")
        .send({ email: "unknown@example.test" });

      expect(known.status).toBe(202);
      expect(unknown.status).toBe(202);
      expect(known.body).toEqual(unknown.body);
      expect(sendgrid.send).toHaveBeenCalledOnce();
    });

    it("keeps the resend response generic when the provider fails", async () => {
      withEmailOn();
      await signUp("retry-later@example.test");
      sendgrid.send.mockClear();
      sendgrid.send.mockRejectedValueOnce(new Error("provider unavailable"));

      const res = await request(app)
        .post("/api/auth/resend-verification")
        .send({ email: "retry-later@example.test" });

      expect(res.status).toBe(202);
      expect(res.body.message).toMatch(/if an unverified account/i);
    });

    it("accepts the password reset request", async () => {
      withEmailOn();
      const res = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email: "nobody@example.test" });

      // Unknown address still gets the non-committal answer.
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/if an account/i);
    });

    it("requires email credentials in production", () => {
      const env = {
        NODE_ENV: "production",
        ENABLE_EMAIL: "true",
        MONGO_URI: "mongodb://db/ticketnest",
        SESSION_SECRET: "a-real-production-secret",
        FRONTEND_URL: "https://ticketnest.example",
        CORS_ORIGINS: "https://ticketnest.example",
        EMAIL_VERIFY_TOKEN_SECRET: "verify",
        PASSWORD_RESET_TOKEN_SECRET: "reset",
      } as NodeJS.ProcessEnv;

      expect(() => loadConfig(env)).toThrowError(/SENDGRID_API_KEY/);
    });

    it("rejects an unparseable flag value", async () => {
      process.env.ENABLE_EMAIL = "sometimes";

      const res = await request(app).get("/api/config");
      expect(res.status).toBe(500);
    });
  });

  describe("verification still works when it is on", () => {
    it("keeps the verify-email endpoint functional", async () => {
      process.env.ENABLE_EMAIL = "true";
      await signUp("verifyme@example.test");
      const user = await userModel
        .findOne({ email: "verifyme@example.test" })
        .lean();

      const jwt = await import("jsonwebtoken");
      const token = jwt.default.sign(
        { userId: String(user!._id), intent: "verify-email" },
        process.env.EMAIL_VERIFY_TOKEN_SECRET as string,
        { expiresIn: "1h" }
      );

      const res = await request(app)
        .post("/api/auth/verify-email")
        .send({ token });

      expect(res.status).toBe(200);
      const after = await userModel
        .findOne({ email: "verifyme@example.test" })
        .lean();
      expect(after!.emailVerified).toBe(true);
    });
  });
});
