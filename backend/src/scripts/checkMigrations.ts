import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../configs/db";
import { pendingMigrationIds } from "../migrations";

const main = async () => {
  await connectDB();

  const pending = await pendingMigrationIds();
  if (pending.length > 0) {
    throw new Error(
      `${pending.length} migration(s) are pending: ${pending.join(", ")}`
    );
  }

  console.log(
    `Migration check passed for "${mongoose.connection.name}": zero pending.`
  );
};

main()
  .catch((err) => {
    console.error("Migration check failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
