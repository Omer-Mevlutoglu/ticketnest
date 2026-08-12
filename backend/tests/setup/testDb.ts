import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";

/**
 * Connects each test worker to the in-memory replica set started in
 * `globalSetup`, and gives every test a clean database.
 */
beforeAll(async () => {
  const uri = process.env.TEST_MONGO_URI;
  if (!uri) {
    throw new Error(
      "TEST_MONGO_URI is not set. The Vitest globalSetup hook did not run."
    );
  }
  if (!uri.includes("127.0.0.1") && !uri.includes("localhost")) {
    throw new Error(`Refusing to run tests against a non-local database: ${uri}`);
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName: "ticketnest-test" });
  }
});

beforeEach(async () => {
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
});
