import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],

    // Starts one in-memory MongoDB replica set for the whole run and tears it
    // down afterwards. A replica set (not standalone) is required because the
    // booking service uses multi-document transactions.
    globalSetup: ["tests/setup/globalSetup.ts"],

    // Order matters: env defaults must exist before Mongoose/app modules load.
    setupFiles: [
      "tests/setup/testEnv.ts",
      "tests/setup/mockCloudinary.ts",
      "tests/setup/blockNetwork.ts",
      "tests/setup/testDb.ts",
    ],

    // Every suite shares one database, so files must not run concurrently.
    pool: "forks",
    fileParallelism: false,
    maxWorkers: 1,

    // Downloading and booting the mongod binary on a cold cache is slow.
    hookTimeout: 180_000,
    testTimeout: 30_000,
  },
});
