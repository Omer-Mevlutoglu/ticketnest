import dotenv from "dotenv";
import { createApp } from "./app";
import { ExpiryWorker } from "./jobs/expiryWorker";
import connectDB from "./configs/db";
import { assertFeatureFlags } from "./configs/features";
import { getConfig } from "./configs/env";
import { seedAdmins } from "./services/adminSeedService";
import { pendingMigrationIds } from "./migrations";
import { createShutdownHandler } from "./utils/gracefulShutdown";

dotenv.config();

const EXPIRE_JOB_MS = 60 * 1000;

/**
 * Warns about migrations that have not been applied.
 *
 * Deliberately a warning and not a failure: refusing to boot would take the
 * whole service down for a schema change that may be additive and harmless.
 * The readiness probe reports unready instead, so an orchestrator holds traffic
 * back without killing the process.
 */
async function checkMigrations() {
  const pending = await pendingMigrationIds();

  if (pending.length > 0) {
    console.warn(
      `⚠️  ${pending.length} pending migration(s): ${pending.join(", ")}. ` +
        `Run "npm run migrate". /readyz will report not ready until then.`
    );
  } else {
    console.log("✅ Schema is up to date.");
  }
}

async function bootstrap() {
  // Validate everything the process needs before touching the network. A
  // missing or malformed value crashes here, naming the variable, rather than
  // surfacing as broken behaviour hours later.
  const config = getConfig();
  assertFeatureFlags();

  await connectDB();
  await checkMigrations();

  // Auto-expire unpaid bookings. Single-instance only — see ExpiryWorker.
  const expiryWorker = new ExpiryWorker({ intervalMs: EXPIRE_JOB_MS });

  // Built before the worker starts and before listen(), so the readiness probe
  // can consult the shutdown flag from the first request onwards.
  let shutdownHandler: { isShuttingDown: () => boolean } | null = null;
  const app = createApp({
    isShuttingDown: () => shutdownHandler?.isShuttingDown() ?? false,
  });

  // Awaited: an admin account half-created while requests are already being
  // served is worse than a slower boot.
  await seedAdmins({
    emails: config.adminEmails,
    initialPassword: config.adminInitialPassword,
  });

  expiryWorker.start();

  const server = app.listen(config.port, () => {
    console.log(`✅ Server is running on port ${config.port}`);
  });

  const handler = createShutdownHandler({ server, worker: expiryWorker });
  shutdownHandler = handler;

  process.on("SIGINT", () => void handler.shutdown("SIGINT"));
  process.on("SIGTERM", () => void handler.shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("❌ Failed to bootstrap server:", err);
  process.exit(1);
});
