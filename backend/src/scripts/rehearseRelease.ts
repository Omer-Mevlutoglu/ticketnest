import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const DATABASE_NAME = "ticketnest-release-rehearsal";
const PRIVATE_ADMIN_EMAIL = "owner@release-rehearsal.invalid";
const PRIVATE_ADMIN_PASSWORD = "RehearsalOwnerPassword123!";

/**
 * Exercises the release data order against an isolated replica set:
 * private owner -> migrations -> guarded fresh demo seed -> readiness state.
 * No value from the developer's normal .env is used as a database target.
 */
const main = async () => {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });

  try {
    process.env.NODE_ENV = "test";
    process.env.MONGO_URI = replSet.getUri(DATABASE_NAME);
    delete process.env.MONGODB_URI;
    process.env.ADMIN_EMAILS = "";
    process.env.ADMIN_INITIAL_PASSWORD = "";
    process.env.ENABLE_EMAIL = "false";

    const { resetConfigCache } = require("../configs/env");
    resetConfigCache();
    const { default: connectDB } = require("../configs/db");
    const { seedAdmins } = require("../services/adminSeedService");
    const { pendingMigrationIds, runMigrations } = require("../migrations");
    const { seedDemo } = require("./seedDemo");
    const { default: userModel } = require("../models/userModel");
    const { eventModel } = require("../models/eventModel");

    await connectDB();
    await seedAdmins({
      emails: [PRIVATE_ADMIN_EMAIL],
      initialPassword: PRIVATE_ADMIN_PASSWORD,
      logger: { log: () => {}, warn: () => {} },
    });

    // Represents a record created by a version before the two additive fields.
    await mongoose.connection.db!.collection("users").insertOne({
      username: "legacy-release-user",
      email: "legacy@release-rehearsal.invalid",
      passwordHash: "not-used",
      role: "attendee",
      emailVerified: true,
      isApproved: true,
    });

    const migrationOutcomes: Array<{ status: "applied" | "skipped" }> =
      await runMigrations();
    const pendingBeforeSeed = await pendingMigrationIds();
    if (pendingBeforeSeed.length > 0) {
      throw new Error(
        `Migration rehearsal left pending ids: ${pendingBeforeSeed.join(", ")}`
      );
    }

    await seedDemo({
      fresh: true,
      confirm: DATABASE_NAME,
      manageConnection: false,
    });

    const [privateAdmin, demoAccounts, demoEvents, pendingAfterSeed] =
      await Promise.all([
        userModel.findOne({ email: PRIVATE_ADMIN_EMAIL }).lean(),
        userModel.countDocuments({ isDemoAccount: true }),
        eventModel.countDocuments({}),
        pendingMigrationIds(),
      ]);

    if (!privateAdmin?.isSystemAdmin || privateAdmin.isDemoAccount) {
      throw new Error("The guarded demo seed did not preserve the private admin");
    }
    if (demoAccounts !== 3 || demoEvents !== 3) {
      throw new Error(
        `Unexpected fixtures: ${demoAccounts} demo accounts, ${demoEvents} demo events`
      );
    }
    if (pendingAfterSeed.length > 0) {
      throw new Error("The fresh seed removed migration records");
    }

    console.log(
      JSON.stringify(
        {
          status: "release_rehearsal_passed",
          database: DATABASE_NAME,
          migrationsApplied: migrationOutcomes.filter(
            (outcome) => outcome.status === "applied"
          ).length,
          pendingMigrations: pendingAfterSeed.length,
          privateAdminPreserved: true,
          demoAccounts,
          demoEvents,
        },
        null,
        2
      )
    );
  } finally {
    await mongoose.disconnect().catch(() => {});
    await replSet.stop();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
