import mongoose from "mongoose";
import userModel from "../models/userModel";

/**
 * Schema migrations, applied in order and recorded so they run once.
 *
 * These used to run on every boot as unawaited IIFEs racing the server
 * accepting traffic — an `updateMany` across the whole users collection on
 * every single start. Now they are explicit: `npm run migrate`, tracked in a
 * `migrations` collection, safe to re-run.
 *
 * Add new entries at the end. Never edit or reorder an applied one — the id is
 * the record that it ran.
 */

export interface Migration {
  /** Stable identifier. Also the record in the `migrations` collection. */
  id: string;
  description: string;
  up: () => Promise<string>;
}

export const migrations: Migration[] = [
  {
    id: "001-backfill-is-suspended",
    description: "Adds isSuspended:false to users created before the field existed",
    up: async () => {
      const result = await userModel.updateMany(
        { isSuspended: { $exists: false } },
        { $set: { isSuspended: false } }
      );
      return `${result.modifiedCount} user(s) updated`;
    },
  },
  {
    id: "002-backfill-session-version",
    description:
      "Adds sessionVersion:0 to users predating session invalidation (WP2.4)",
    up: async () => {
      const result = await userModel.updateMany(
        { sessionVersion: { $exists: false } },
        { $set: { sessionVersion: 0 } }
      );
      return `${result.modifiedCount} user(s) updated`;
    },
  },
];

interface MigrationRecord {
  _id: string;
  appliedAt: Date;
  description: string;
}

const collection = () =>
  mongoose.connection.db!.collection<MigrationRecord>("migrations");

/** Ids of migrations already applied to this database. */
export const appliedMigrationIds = async (): Promise<Set<string>> => {
  const records = await collection().find({}, { projection: { _id: 1 } }).toArray();
  return new Set(records.map((r) => r._id));
};

export interface MigrationOutcome {
  id: string;
  status: "applied" | "skipped";
  detail?: string;
}

/**
 * Runs every migration that has not been applied yet.
 *
 * Each is recorded only after its `up` resolves, so a failure leaves it
 * pending and the next run retries it rather than skipping it silently.
 */
export const runMigrations = async (
  logger: Pick<Console, "log"> = console
): Promise<MigrationOutcome[]> => {
  const applied = await appliedMigrationIds();
  const outcomes: MigrationOutcome[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      outcomes.push({ id: migration.id, status: "skipped" });
      continue;
    }

    logger.log(`▶ ${migration.id} — ${migration.description}`);
    const detail = await migration.up();

    await collection().insertOne({
      _id: migration.id,
      appliedAt: new Date(),
      description: migration.description,
    });

    logger.log(`✅ ${migration.id} — ${detail}`);
    outcomes.push({ id: migration.id, status: "applied", detail });
  }

  return outcomes;
};

/** Migrations that still need to run. Used by the readiness check. */
export const pendingMigrationIds = async (): Promise<string[]> => {
  const applied = await appliedMigrationIds();
  return migrations.map((m) => m.id).filter((id) => !applied.has(id));
};
