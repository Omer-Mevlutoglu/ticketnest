import dotenv from "dotenv";
import mongoose from "mongoose";
import { createApp } from "./app";
import { ExpiryWorker } from "./jobs/expiryWorker";
import userModel from "./models/userModel";
import { hashPassword } from "./utils/helperHash";
import connectDB from "./configs/db";
import { assertFeatureFlags } from "./configs/features";

dotenv.config();

const EXPIRE_JOB_MS = 60 * 1000;

// Backfills `isSuspended` on user documents created before the field existed.
// TODO(WP5.2): move this into an explicit, versioned migration script.
async function migrateUsers() {
  try {
    console.log("Checking for user schema migration...");
    const result = await userModel.updateMany(
      { isSuspended: { $exists: false } },
      { $set: { isSuspended: false } }
    );
    if (result.modifiedCount > 0) {
      console.log(
        `✅ Migrated ${result.modifiedCount} users (added 'isSuspended' field).`
      );
    } else {
      console.log("✅ User schema is up to date.");
    }
  } catch (err) {
    console.error("❌ User migration failed:", err);
  }
}

// TODO(WP2.5): only create the missing admins and require a password change.
async function seedAdmins() {
  const adminEmails: string[] = process.env.ADMIN_EMAILS
    ? JSON.parse(process.env.ADMIN_EMAILS)
    : [];
  const missingAdmins: string[] = [];
  for (const email of adminEmails) {
    const exists = await userModel.findOne({ email, role: "admin" });
    if (!exists) missingAdmins.push(email);
  }
  if (missingAdmins.length > 0) {
    for (const email of adminEmails) {
      const pw = await hashPassword(process.env.ADMIN_INITIAL_PASSWORD!);
      await userModel.create({
        username: email.split("@")[0],
        email,
        passwordHash: pw,
        role: "admin",
        emailVerified: true,
      });
      console.log(`✅ Seeded admin account: ${email}`);
    }
  }
}

async function bootstrap() {
  // Fail fast on a malformed flag rather than silently changing behaviour.
  assertFeatureFlags();

  await connectDB();

  await migrateUsers();

  const app = createApp();

  await seedAdmins();

  // Auto-expire unpaid bookings. Single-instance only — see ExpiryWorker.
  const expiryWorker = new ExpiryWorker({ intervalMs: EXPIRE_JOB_MS });
  expiryWorker.start();

  const port = Number(process.env.PORT) || 5000;
  const server = app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
  });

  // Stop scheduling new sweeps and let the in-flight one finish.
  // TODO(WP5.2): also drain in-flight HTTP requests and close MongoDB.
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received, shutting down…`);

    await expiryWorker.stop();
    server.close(async () => {
      await mongoose.connection.close().catch(() => {});
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("❌ Failed to bootstrap server:", err);
  process.exit(1);
});
