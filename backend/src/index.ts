import dotenv from "dotenv";
import mongoose from "mongoose";
import { createApp } from "./app";
import { ExpiryWorker } from "./jobs/expiryWorker";
import userModel from "./models/userModel";
import connectDB from "./configs/db";
import { assertFeatureFlags } from "./configs/features";
import { getConfig } from "./configs/env";
import { seedAdmins } from "./services/adminSeedService";

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

async function bootstrap() {
  // Validate everything the process needs before touching the network. A
  // missing or malformed value crashes here, naming the variable, rather than
  // surfacing as broken behaviour hours later.
  const config = getConfig();
  assertFeatureFlags();

  await connectDB();

  await migrateUsers();

  const app = createApp();

  // Awaited: an admin account half-created while requests are already being
  // served is worse than a slower boot.
  await seedAdmins({
    emails: config.adminEmails,
    initialPassword: config.adminInitialPassword,
  });

  // Auto-expire unpaid bookings. Single-instance only — see ExpiryWorker.
  const expiryWorker = new ExpiryWorker({ intervalMs: EXPIRE_JOB_MS });
  expiryWorker.start();

  const server = app.listen(config.port, () => {
    console.log(`✅ Server is running on port ${config.port}`);
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
