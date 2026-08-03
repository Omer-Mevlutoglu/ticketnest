import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Boots a single-node in-memory replica set for the whole test run.
 *
 * A replica set is mandatory: `bookingService` wraps seat claims in
 * `session.withTransaction`, and MongoDB refuses transactions on a standalone
 * server. The URI is handed to the test workers through the environment,
 * which they inherit when Vitest forks them after this hook resolves.
 */
export default async function globalSetup() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });

  process.env.TEST_MONGO_URI = replSet.getUri();

  return async () => {
    await replSet.stop();
  };
}
