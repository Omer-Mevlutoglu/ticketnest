import type { Express } from "express";
import { beforeAll, describe, expect, it } from "vitest";
import userModel from "../src/models/userModel";
import { createAdmin, DEFAULT_PASSWORD } from "./factories";
import { buildTestApp, loginAgent } from "./helpers";

describe("Phase 5 — seeded admin password rotation", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  it("blocks admin routes until the bootstrap password is replaced", async () => {
    const email = "rotate-admin@test.dev";
    const { user } = await createAdmin({ email, mustChangePassword: true });
    const agent = await loginAgent(app, email);

    const blocked = await agent.get("/api/admin/stats");
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const rejected = await agent.post("/api/auth/change-password").send({
      currentPassword: "wrong-password",
      newPassword: "A-new-private-password-123",
    });
    expect(rejected.status).toBe(400);
    await expect(
      userModel.findById(user._id).then((current) => current?.mustChangePassword)
    ).resolves.toBe(true);

    const changed = await agent.post("/api/auth/change-password").send({
      currentPassword: DEFAULT_PASSWORD,
      newPassword: "A-new-private-password-123",
    });
    expect(changed.status).toBe(200);

    expect((await agent.get("/api/auth/me")).status).toBe(401);
    const fresh = await loginAgent(app, email, "A-new-private-password-123");
    expect((await fresh.get("/api/admin/stats")).status).toBe(200);

    const updated = await userModel.findById(user._id).lean();
    expect(updated?.mustChangePassword).toBe(false);
    expect(updated?.sessionVersion).toBe(1);
    expect(updated?.passwordChangedAt).toBeInstanceOf(Date);
  });
});
