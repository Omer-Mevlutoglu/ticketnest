import userModel from "../models/userModel";
import { hashPassword } from "../utils/helperHash";

export interface SeedAdminsOptions {
  emails: string[];
  initialPassword?: string;
  logger?: Pick<Console, "log" | "warn">;
}

export interface SeedAdminsResult {
  created: string[];
  skipped: string[];
}

/**
 * Creates any configured admin accounts that do not exist yet.
 *
 * The previous implementation computed which admins were missing and then, if
 * any were, looped over the **full** configured list — re-creating accounts
 * that already existed and throwing on the unique `email` index. Repeated
 * startups were not idempotent.
 *
 * Every seeded account is flagged `mustChangePassword`, because a shared
 * bootstrap password handed to several people is a credential nobody owns.
 * Prefer creating admins individually and leaving `ADMIN_EMAILS` empty once the
 * first one exists.
 */
export const seedAdmins = async ({
  emails,
  initialPassword,
  logger = console,
}: SeedAdminsOptions): Promise<SeedAdminsResult> => {
  const created: string[] = [];
  const skipped: string[] = [];

  if (emails.length === 0) return { created, skipped };

  if (!initialPassword) {
    throw new Error(
      "ADMIN_INITIAL_PASSWORD is required to seed the accounts in ADMIN_EMAILS"
    );
  }

  for (const email of emails) {
    // Match on email alone: an existing non-admin account with this address
    // must not be shadowed by a second document.
    const existing = await userModel.findOne({ email }).lean();
    if (existing) {
      skipped.push(email);
      if (existing.role !== "admin") {
        logger.warn(
          `⚠️  ${email} is listed in ADMIN_EMAILS but already exists with role "${existing.role}". Not modified.`
        );
      }
      continue;
    }

    await userModel.create({
      username: email.split("@")[0],
      email,
      passwordHash: await hashPassword(initialPassword),
      role: "admin",
      emailVerified: true,
      isApproved: true,
      mustChangePassword: true,
    });

    created.push(email);
    logger.log(`✅ Seeded admin account: ${email} (must change password)`);
  }

  if (created.length > 0) {
    logger.warn(
      `⚠️  ${created.length} admin account(s) were created with the shared ADMIN_INITIAL_PASSWORD. Change it on first login and remove the variable.`
    );
  }

  return { created, skipped };
};
