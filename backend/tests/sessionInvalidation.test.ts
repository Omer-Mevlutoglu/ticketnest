import type { Express } from "express";
import jwt from "jsonwebtoken";
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import userModel from "../src/models/userModel";
import { isTokenIssuedBeforePasswordChange } from "../src/services/sessionService";
import { createAdmin, createAttendee, DEFAULT_PASSWORD } from "./factories";
import { buildTestApp, loginAgent } from "./helpers";

/**
 * WP2.4 — a credential or privilege change must end sessions immediately, and
 * a reset link must not survive its own use.
 */
describe("WP2.4 — session and credential invalidation", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  const resetTokenFor = (userId: string, issuedAt?: number) =>
    jwt.sign(
      {
        userId,
        intent: "reset-password",
        ...(issuedAt ? { iat: issuedAt } : {}),
      },
      process.env.PASSWORD_RESET_TOKEN_SECRET as string,
      { expiresIn: "15m" }
    );

  describe("password reset", () => {
    it("signs the user out everywhere", async () => {
      const { user } = await createAttendee({ email: "reset@example.test" });
      const agent = await loginAgent(app, "reset@example.test");

      await expect(
        agent.get("/api/auth/me").then((r) => r.status)
      ).resolves.toBe(200);

      const reset = await request(app).post("/api/auth/reset-password").send({
        token: resetTokenFor(String(user._id)),
        password: "brand-new-password",
      });
      expect(reset.status).toBe(200);

      // The session opened with the old password is now dead.
      const after = await agent.get("/api/auth/me");
      expect(after.status).toBe(401);
      expect(after.body.code).toBe("SESSION_REVOKED");
    });

    it("refuses to reuse a reset token", async () => {
      const { user } = await createAttendee({ email: "once@example.test" });
      const token = resetTokenFor(String(user._id));

      const first = await request(app)
        .post("/api/auth/reset-password")
        .send({ token, password: "first-new-password" });
      expect(first.status).toBe(200);

      const second = await request(app)
        .post("/api/auth/reset-password")
        .send({ token, password: "second-new-password" });
      expect(second.status).toBe(400);
      expect(second.body.message).toMatch(/already been used/i);
    });

    it("lets the user log in with the new password only", async () => {
      const { user } = await createAttendee({ email: "newpw@example.test" });

      await request(app).post("/api/auth/reset-password").send({
        token: resetTokenFor(String(user._id)),
        password: "the-new-password",
      });

      const old = await request(app)
        .post("/api/auth/login")
        .send({ email: "newpw@example.test", password: DEFAULT_PASSWORD });
      expect(old.status).toBe(401);

      const fresh = await request(app)
        .post("/api/auth/login")
        .send({ email: "newpw@example.test", password: "the-new-password" });
      expect(fresh.status).toBe(200);
    });

    it("refuses a reset for a suspended account", async () => {
      const { user } = await createAttendee({
        email: "susp@example.test",
        isSuspended: true,
      });

      const res = await request(app).post("/api/auth/reset-password").send({
        token: resetTokenFor(String(user._id)),
        password: "does-not-matter",
      });

      expect(res.status).toBe(403);
    });
  });

  describe("suspension", () => {
    it("ends the suspended user's existing sessions", async () => {
      const { user } = await createAttendee({ email: "target@example.test" });
      await createAdmin({ email: "admin@example.test" });

      const victim = await loginAgent(app, "target@example.test");
      const admin = await loginAgent(app, "admin@example.test");

      await expect(
        victim.get("/api/auth/me").then((r) => r.status)
      ).resolves.toBe(200);

      const suspend = await admin.put(`/api/admin/users/${user._id}/suspend`);
      expect(suspend.status).toBe(200);

      const after = await victim.get("/api/auth/me");
      expect(after.status).toBe(403);
      expect(after.body.code).toBe("ACCOUNT_SUSPENDED");
    });

    it("does not resurrect old sessions when the suspension is lifted", async () => {
      const { user } = await createAttendee({ email: "back@example.test" });
      await createAdmin({ email: "admin2@example.test" });

      const victim = await loginAgent(app, "back@example.test");
      const admin = await loginAgent(app, "admin2@example.test");

      await admin.put(`/api/admin/users/${user._id}/suspend`);
      await admin.put(`/api/admin/users/${user._id}/unsuspend`);

      const after = await victim.get("/api/auth/me");
      expect(after.status).toBe(401);

      // A fresh login works again.
      const fresh = await loginAgent(app, "back@example.test");
      await expect(
        fresh.get("/api/auth/me").then((r) => r.status)
      ).resolves.toBe(200);
    });

    it("leaves other users' sessions alone", async () => {
      const { user: target } = await createAttendee({ email: "t1@example.test" });
      await createAttendee({ email: "bystander@example.test" });
      await createAdmin({ email: "admin3@example.test" });

      const bystander = await loginAgent(app, "bystander@example.test");
      const admin = await loginAgent(app, "admin3@example.test");

      await admin.put(`/api/admin/users/${target._id}/suspend`);

      await expect(
        bystander.get("/api/auth/me").then((r) => r.status)
      ).resolves.toBe(200);
    });
  });

  describe("privilege withdrawal", () => {
    it("ends sessions when approval is revoked but not when it is granted", async () => {
      const { user } = await createAttendee({ email: "org@example.test" });
      await createAdmin({ email: "admin4@example.test" });

      const member = await loginAgent(app, "org@example.test");
      const admin = await loginAgent(app, "admin4@example.test");

      await admin
        .put(`/api/admin/users/${user._id}/set-approval`)
        .send({ isApproved: true });

      // Granting access should not sign anyone out.
      await expect(
        member.get("/api/auth/me").then((r) => r.status)
      ).resolves.toBe(200);

      await admin
        .put(`/api/admin/users/${user._id}/set-approval`)
        .send({ isApproved: false });

      await expect(
        member.get("/api/auth/me").then((r) => r.status)
      ).resolves.toBe(401);
    });
  });

  describe("login", () => {
    it("issues a new session id, so a fixed session cannot be reused", async () => {
      await createAttendee({ email: "fixation@example.test" });
      const agent = request.agent(app);

      // Establish an anonymous session first.
      await agent.get("/api/csrf-token");
      const before = await agent.get("/api/csrf-token");
      const beforeCookie = before.headers["set-cookie"];

      const login = await agent
        .post("/api/auth/login")
        .send({ email: "fixation@example.test", password: DEFAULT_PASSWORD });

      expect(login.status).toBe(200);
      // A new connect.sid is issued at login.
      const loginCookies = String(login.headers["set-cookie"] ?? "");
      expect(loginCookies).toContain("connect.sid");
      expect(loginCookies).not.toBe(String(beforeCookie ?? ""));
    });

    it("stamps the session with the user's current version", async () => {
      const { user } = await createAttendee({ email: "stamp@example.test" });
      const agent = await loginAgent(app, "stamp@example.test");

      // Bump the version out from under the live session.
      await userModel.updateOne({ _id: user._id }, { $inc: { sessionVersion: 1 } });

      await expect(
        agent.get("/api/auth/me").then((r) => r.status)
      ).resolves.toBe(401);
    });
  });

  describe("email verification", () => {
    it("is single-use", async () => {
      const { user } = await createAttendee({
        email: "verify@example.test",
        emailVerified: false,
      });
      const token = jwt.sign(
        { userId: String(user._id), intent: "verify-email" },
        process.env.EMAIL_VERIFY_TOKEN_SECRET as string,
        { expiresIn: "1h" }
      );

      const first = await request(app)
        .post("/api/auth/verify-email")
        .send({ token });
      expect(first.body.message).toMatch(/verified successfully/i);

      const second = await request(app)
        .post("/api/auth/verify-email")
        .send({ token });
      expect(second.body.message).toMatch(/already verified/i);
    });
  });

  describe("isTokenIssuedBeforePasswordChange", () => {
    const at = (iso: string) => new Date(iso);

    it("allows a token issued after the last change", () => {
      expect(
        isTokenIssuedBeforePasswordChange(
          Math.floor(at("2026-01-01T00:00:10Z").getTime() / 1000),
          at("2026-01-01T00:00:00Z")
        )
      ).toBe(false);
    });

    it("rejects a token issued before the last change", () => {
      expect(
        isTokenIssuedBeforePasswordChange(
          Math.floor(at("2026-01-01T00:00:00Z").getTime() / 1000),
          at("2026-01-01T00:00:10Z")
        )
      ).toBe(true);
    });

    it("rejects a token issued in the same second as the change", () => {
      // `iat` has second precision, so same-second is treated as stale rather
      // than risking a replay.
      expect(
        isTokenIssuedBeforePasswordChange(
          Math.floor(at("2026-01-01T00:00:05Z").getTime() / 1000),
          at("2026-01-01T00:00:05.400Z")
        )
      ).toBe(true);
    });

    it("allows any token when the password has never been changed", () => {
      expect(isTokenIssuedBeforePasswordChange(1_700_000_000, undefined)).toBe(
        false
      );
    });

    it("rejects a token with no issued-at claim", () => {
      expect(
        isTokenIssuedBeforePasswordChange(undefined, at("2026-01-01T00:00:00Z"))
      ).toBe(true);
    });
  });
});
