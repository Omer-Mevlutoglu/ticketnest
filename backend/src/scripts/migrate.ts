import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../configs/db";
import { runMigrations } from "../migrations";

dotenv.config();

/**
 * Applies pending schema migrations. Run with `npm run migrate`.
 *
 * Deliberately a separate command rather than part of server startup: a
 * migration that runs automatically on every boot is one you cannot review,
 * cannot roll back, and which races the server accepting traffic.
 */
const main = async () => {
  await connectDB();
  console.log(`Running migrations against "${mongoose.connection.name}"…`);

  const outcomes = await runMigrations();
  const applied = outcomes.filter((o) => o.status === "applied");

  console.log(
    applied.length === 0
      ? "Nothing to do — all migrations already applied."
      : `Done: ${applied.length} migration(s) applied.`
  );

  await mongoose.connection.close();
};

main().catch(async (err) => {
  console.error("Migration failed:", err);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
