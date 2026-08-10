import type { Express } from "express";
import mongoose from "mongoose";
import { beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import userModel from "../src/models/userModel";
import {
  appliedMigrationIds,
  migrations,
  pendingMigrationIds,
  runMigrations,
} from "../src/migrations";
import { createShutdownHandler } from "../src/utils/gracefulShutdown";
import { ExpiryWorker } from "../src/jobs/expiryWorker";
import { buildTestApp } from "./helpers";

/** WP5.2 and WP5.4 — migrations, shutdown, health, request context. */

const silent = { log: () => {}, error: () => {} };

describe("WP5.2 — migrations", () => {
  it("applies every pending migration and records it", async () => {
    const outcomes = await runMigrations(silent);

    expect(outcomes).toHaveLength(migrations.length);
    expect(outcomes.every((o) => o.status === "applied")).toBe(true);
    await expect(pendingMigrationIds()).resolves.toEqual([]);
  });

  it("is idempotent — a second run applies nothing", async () => {
    await runMigrations(silent);
    const second = await runMigrations(silent);

    expect(second.every((o) => o.status === "skipped")).toBe(true);
  });

  it("actually backfills the field it claims to", async () => {
    // A user document predating the field, written straight through the driver
    // so Mongoose defaults do not fill it in.
    await mongoose.connection.db!.collection("users").insertOne({
      username: "legacy",
      email: "legacy@example.test",
      passwordHash: "x",
      role: "attendee",
      emailVerified: true,
      isApproved: true,
    });

    await runMigrations(silent);

    const user = await userModel.findOne({ email: "legacy@example.test" }).lean();
    expect(user!.isSuspended).toBe(false);
    expect(user!.sessionVersion).toBe(0);
  });

  it("records each migration under its own id", async () => {
    await runMigrations(silent);

    const applied = await appliedMigrationIds();
    for (const migration of migrations) {
      expect(applied.has(migration.id)).toBe(true);
    }
  });

  it("leaves a failed migration pending so the next run retries it", async () => {
    const failing = {
      id: "999-deliberately-failing",
      description: "Test-only",
      up: async () => {
        throw new Error("migration exploded");
      },
    };
    migrations.push(failing);

    try {
      await expect(runMigrations(silent)).rejects.toThrow("migration exploded");

      // Not recorded, so it will be attempted again rather than skipped.
      const applied = await appliedMigrationIds();
      expect(applied.has(failing.id)).toBe(false);
      await expect(pendingMigrationIds()).resolves.toContain(failing.id);
    } finally {
      migrations.pop();
    }
  });
});

describe("WP5.2 — graceful shutdown", () => {
  /** A stand-in for http.Server that records how it was closed. */
  const fakeServer = (closeDelayMs = 0) => {
    const calls = { close: 0, closeIdle: 0 };
    return {
      calls,
      server: {
        close: (cb?: () => void) => {
          calls.close++;
          setTimeout(() => cb?.(), closeDelayMs);
        },
        closeIdleConnections: () => {
          calls.closeIdle++;
        },
      } as never,
    };
  };

  it("stops the worker, closes the server, then exits cleanly", async () => {
    const { server, calls } = fakeServer();
    const worker = new ExpiryWorker({
      run: async () => ({ expiredCount: 0, releasedSeats: 0, failedCount: 0 }),
      logger: silent,
    });
    const stop = vi.spyOn(worker, "stop");
    const exit = vi.fn();

    const { shutdown } = createShutdownHandler({
      server,
      worker,
      logger: silent,
      exit,
      closeDatabase: async () => {},
    });
    await shutdown("SIGTERM");

    expect(stop).toHaveBeenCalledOnce();
    expect(calls.close).toBe(1);
    // Idle keep-alive sockets would otherwise hold the server open.
    expect(calls.closeIdle).toBe(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("reports unready as soon as shutdown begins", async () => {
    const { server } = fakeServer(50);
    const worker = new ExpiryWorker({ logger: silent });
    const { shutdown, isShuttingDown } = createShutdownHandler({
      server,
      worker,
      logger: silent,
      exit: () => {},
      closeDatabase: async () => {},
    });

    expect(isShuttingDown()).toBe(false);
    const running = shutdown("SIGTERM");
    // Flips before the socket closes, so a load balancer can drain first.
    expect(isShuttingDown()).toBe(true);
    await running;
  });

  it("ignores a second signal", async () => {
    const { server, calls } = fakeServer();
    const worker = new ExpiryWorker({ logger: silent });
    const exit = vi.fn();
    const { shutdown } = createShutdownHandler({
      server,
      worker,
      logger: silent,
      exit,
      closeDatabase: async () => {},
    });

    await Promise.all([shutdown("SIGTERM"), shutdown("SIGINT")]);

    expect(calls.close).toBe(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("gives up on the deadline rather than hanging forever", async () => {
    // A server that never finishes closing — the case the deadline exists for.
    const server = {
      close: () => {},
      closeIdleConnections: () => {},
    } as never;
    const worker = new ExpiryWorker({ logger: silent });
    const exit = vi.fn();

    const { shutdown } = createShutdownHandler({
      server,
      worker,
      timeoutMs: 40,
      logger: silent,
      exit,
      closeDatabase: async () => {},
    });

    void shutdown("SIGTERM");
    await new Promise((r) => setTimeout(r, 120));

    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe("WP5.4 — health and request context", () => {
  let app: Express;

  beforeAll(() => {
    app = buildTestApp();
  });

  describe("liveness", () => {
    it("answers without touching the database", async () => {
      const res = await request(app).get("/healthz");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(typeof res.body.uptimeSeconds).toBe("number");
    });

    it("leaks nothing about the deployment", async () => {
      const res = await request(app).get("/healthz");
      const body = JSON.stringify(res.body);

      expect(body).not.toMatch(/mongodb|password|secret|version/i);
    });
  });

  describe("readiness", () => {
    it("is ready when connected and migrated", async () => {
      await runMigrations(silent);

      const res = await request(app).get("/readyz");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: "ready", database: "connected" });
    });

    it("is not ready while migrations are pending", async () => {
      // Wipe the record so every migration counts as pending again.
      await mongoose.connection.db!.collection("migrations").deleteMany({});

      const res = await request(app).get("/readyz");

      expect(res.status).toBe(503);
      expect(res.body.status).toBe("not_ready");
      expect(res.body.pendingMigrations).toBe(migrations.length);
    });

    it("reports shutting down when the app says so", async () => {
      const draining = buildTestApp({ isShuttingDown: () => true });

      const res = await request(draining).get("/readyz");

      expect(res.status).toBe(503);
      expect(res.body.status).toBe("shutting_down");
    });
  });

  describe("request ids", () => {
    it("returns one on every response", async () => {
      const res = await request(app).get("/api/config");

      expect(res.headers["x-request-id"]).toBeTruthy();
    });

    it("gives different requests different ids", async () => {
      const [a, b] = await Promise.all([
        request(app).get("/api/config"),
        request(app).get("/api/config"),
      ]);

      expect(a.headers["x-request-id"]).not.toBe(b.headers["x-request-id"]);
    });

    it("honours an inbound id so a trace stays intact", async () => {
      const res = await request(app)
        .get("/api/config")
        .set("x-request-id", "upstream-trace-123");

      expect(res.headers["x-request-id"]).toBe("upstream-trace-123");
    });

    it("refuses a malformed inbound id rather than echoing it", async () => {
      // Header injection and unbounded values do not belong in a log line.
      const res = await request(app)
        .get("/api/config")
        .set("x-request-id", "not valid!! <script>");

      expect(res.headers["x-request-id"]).not.toBe("not valid!! <script>");
      expect(res.headers["x-request-id"]).toMatch(/^[A-Za-z0-9-]+$/);
    });
  });
});
