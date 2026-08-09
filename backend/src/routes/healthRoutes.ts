import { Router } from "express";
import mongoose from "mongoose";
import { pendingMigrationIds } from "../migrations";

/**
 * Liveness and readiness.
 *
 * Two endpoints because they answer different questions, and conflating them
 * is how a rolling deploy ends up serving traffic to an instance that cannot
 * reach its database:
 *
 *   /healthz  — is the process alive? Restart it if not.
 *   /readyz   — should it receive traffic? Take it out of rotation if not.
 *
 * Neither reveals anything useful to an attacker: no versions, no hostnames,
 * no connection strings.
 */

export interface HealthRoutesOptions {
  /** True once shutdown has begun, so readiness fails before the socket closes. */
  isShuttingDown?: () => boolean;
}

const startedAt = Date.now();

export const createHealthRoutes = ({
  isShuttingDown = () => false,
}: HealthRoutesOptions = {}) => {
  const router = Router();

  // Alive means "this process is running and responding". It deliberately does
  // not check MongoDB — a database blip should not cause an infinite restart
  // loop of otherwise healthy processes.
  router.get("/healthz", (_req, res) => {
    res.json({ status: "ok", uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000) });
  });

  router.get("/readyz", async (_req, res) => {
    if (isShuttingDown()) {
      return res
        .status(503)
        .json({ status: "shutting_down", database: "unknown" });
    }

    // 1 === connected. Anything else and this instance cannot serve a request
    // that touches data, which is nearly all of them.
    const connected = mongoose.connection.readyState === 1;
    if (!connected) {
      return res
        .status(503)
        .json({ status: "not_ready", database: "disconnected" });
    }

    try {
      const pending = await pendingMigrationIds();
      if (pending.length > 0) {
        // Serving traffic against a schema the code does not expect is worse
        // than serving none.
        return res.status(503).json({
          status: "not_ready",
          database: "connected",
          pendingMigrations: pending.length,
        });
      }
    } catch {
      return res
        .status(503)
        .json({ status: "not_ready", database: "unreadable" });
    }

    res.json({ status: "ready", database: "connected" });
  });

  return router;
};

export default createHealthRoutes;
