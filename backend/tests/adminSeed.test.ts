import { describe, expect, it } from "vitest";
import userModel from "../src/models/userModel";
import { seedAdmins } from "../src/services/adminSeedService";
import { createUser } from "./factories";

/** WP2.5 — seeding creates only what is missing, and is safe to repeat. */

const silent = { log: () => {}, warn: () => {} };
const PASSWORD = "bootstrap-password-1";

describe("WP2.5 — admin seeding", () => {
  it("creates only the missing admin when one already exists", async () => {
    await createUser({ email: "existing@example.test", role: "admin" });

    const result = await seedAdmins({
      emails: ["existing@example.test", "missing@example.test"],
      initialPassword: PASSWORD,
      logger: silent,
    });

    expect(result.created).toEqual(["missing@example.test"]);
    expect(result.skipped).toEqual(["existing@example.test"]);
    await expect(userModel.countDocuments({ role: "admin" })).resolves.toBe(2);
  });

  it("is idempotent across repeated startups", async () => {
    const emails = ["a@example.test", "b@example.test"];

    const first = await seedAdmins({
      emails,
      initialPassword: PASSWORD,
      logger: silent,
    });
    const second = await seedAdmins({
      emails,
      initialPassword: PASSWORD,
      logger: silent,
    });

    expect(first.created).toHaveLength(2);
    expect(second.created).toHaveLength(0);
    expect(second.skipped).toHaveLength(2);
    await expect(userModel.countDocuments()).resolves.toBe(2);
  });

  it("flags seeded accounts as needing a password change", async () => {
    await seedAdmins({
      emails: ["fresh@example.test"],
      initialPassword: PASSWORD,
      logger: silent,
    });

    const admin = await userModel.findOne({ email: "fresh@example.test" }).lean();
    expect(admin!.mustChangePassword).toBe(true);
    expect(admin!.role).toBe("admin");
    expect(admin!.emailVerified).toBe(true);
    expect(admin!.isSystemAdmin).toBe(true);
    expect(admin!.isDemoAccount).toBe(false);
  });

  it("reconciles an existing admin as trusted without changing its password", async () => {
    const { user } = await createUser({
      email: "existing-admin@example.test",
      role: "admin",
    });
    const originalHash = user.passwordHash;

    await seedAdmins({
      emails: ["existing-admin@example.test"],
      initialPassword: PASSWORD,
      logger: silent,
    });

    const reconciled = await userModel.findById(user._id).lean();
    expect(reconciled!.isSystemAdmin).toBe(true);
    expect(reconciled!.isDemoAccount).toBe(false);
    expect(reconciled!.passwordHash).toBe(originalHash);
  });

  it("never overwrites an existing non-admin account", async () => {
    await createUser({ email: "person@example.test", role: "attendee" });

    await seedAdmins({
      emails: ["person@example.test"],
      initialPassword: PASSWORD,
      logger: silent,
    });

    const user = await userModel.findOne({ email: "person@example.test" }).lean();
    expect(user!.role).toBe("attendee");
    await expect(userModel.countDocuments()).resolves.toBe(1);
  });

  it("refuses to seed without a bootstrap password", async () => {
    await expect(
      seedAdmins({ emails: ["x@example.test"], logger: silent })
    ).rejects.toThrow(/ADMIN_INITIAL_PASSWORD/);
  });

  it("does nothing when no admins are configured", async () => {
    const result = await seedAdmins({ emails: [], logger: silent });

    expect(result).toEqual({ created: [], skipped: [] });
    await expect(userModel.countDocuments()).resolves.toBe(0);
  });
});
