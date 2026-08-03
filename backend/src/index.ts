import dotenv from "dotenv";
import { createApp } from "./app";
import { expireOverdueBookings } from "./services/bookingService";
import userModel from "./models/userModel";
import { hashPassword } from "./utils/helperHash";
import connectDB from "./configs/db";

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
  await connectDB();

  await migrateUsers();

  const app = createApp();

  await seedAdmins();

  // Auto-expire unpaid bookings (runs every EXPIRE_JOB_MS)
  // TODO(WP1.5): extract the worker lifecycle and guard against overlapping runs.
  const runExpireJob = async () => {
    try {
      const { expiredCount, releasedSeats } = await expireOverdueBookings();
      if (expiredCount || releasedSeats) {
        console.log(
          `🕒 Auto-expire run → bookings expired: ${expiredCount}, seats released: ${releasedSeats}`
        );
      }
    } catch (err) {
      console.error("expireOverdueBookings error:", err);
    }
  };

  runExpireJob();
  const expireTimer = setInterval(runExpireJob, EXPIRE_JOB_MS);

  // Clean up on shutdown
  // TODO(WP5.2): drain in-flight requests before exiting.
  process.on("SIGINT", () => {
    clearInterval(expireTimer);
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    clearInterval(expireTimer);
    process.exit(0);
  });

  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Failed to bootstrap server:", err);
  process.exit(1);
});
