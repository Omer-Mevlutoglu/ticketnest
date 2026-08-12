import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import type { Server } from "node:http";
import path from "node:path";

const DATABASE_NAME = "ticketnest-browser-test";
const PORT = 5100;
// Keep the binary cache inside the project dependency tree. This avoids ever
// requiring access to a developer's profile cache and remains ignored by Git.
process.env.MONGOMS_DOWNLOAD_DIR ??= path.resolve(
  __dirname,
  "../../node_modules/.cache/mongodb-binaries"
);
let server: Server | undefined;
let replSet: MongoMemoryReplSet | undefined;
let stopping = false;

const stop = async (signal: string) => {
  if (stopping) return;
  stopping = true;
  console.log(`Stopping isolated browser-test server (${signal})...`);

  await new Promise<void>((resolve) => {
    if (!server) return resolve();
    server.close(() => resolve());
  });
  await mongoose.disconnect().catch(() => {});
  await replSet?.stop().catch(() => {});
};

const stopAndExit = async (signal: string) => {
  await stop(signal);
  process.exit(0);
};

const main = async () => {
  console.log("Starting isolated MongoDB replica set...");
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  console.log("Isolated MongoDB replica set started.");

  process.env.NODE_ENV = "test";
  process.env.PORT = String(PORT);
  process.env.MONGO_URI = replSet.getUri(DATABASE_NAME);
  delete process.env.MONGODB_URI;
  process.env.SESSION_SECRET = "browser-test-session-secret";
  process.env.FRONTEND_URL = "http://127.0.0.1:4173";
  process.env.CORS_ORIGINS = "http://127.0.0.1:4173";
  process.env.EMAIL_VERIFY_TOKEN_SECRET = "browser-test-email-secret";
  process.env.PASSWORD_RESET_TOKEN_SECRET = "browser-test-reset-secret";
  process.env.ENABLE_EMAIL = "false";
  process.env.ENABLE_MOCK_PAYMENTS = "true";
  process.env.DEMO_MODE = "false";
  process.env.DISABLE_RATE_LIMITS = "true";
  process.env.ADMIN_EMAILS = "";
  process.env.ADMIN_INITIAL_PASSWORD = "";

  const { resetConfigCache } = require("../configs/env");
  resetConfigCache();
  const { default: connectDB } = require("../configs/db");
  const { runMigrations } = require("../migrations");
  const { seedDemo } = require("./seedDemo");
  const { createApp } = require("../app");

  await connectDB();
  await runMigrations();
  await seedDemo({ manageConnection: false });

  const app = createApp();
  server = app.listen(PORT, "127.0.0.1", () => {
    console.log(
      `Isolated browser-test API listening at http://127.0.0.1:${PORT}`
    );
  });

  process.on("SIGINT", () => void stopAndExit("SIGINT"));
  process.on("SIGTERM", () => void stopAndExit("SIGTERM"));
};

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  await stop("startup failure");
  process.exit(1);
});
