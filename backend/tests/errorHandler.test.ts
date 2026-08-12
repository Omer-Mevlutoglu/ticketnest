import express, { Express } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import errorHandler from "../src/middleware/errorHandler";
import { httpError } from "../src/utils/httpError";

/** WP2.1 — one exit point, stable statuses, no internals leaked in production. */

const appThrowing = (err: unknown): Express => {
  const app = express();
  app.use((req, res, next) => {
    req.id = req.get("x-request-id") ?? "generated-test-request-id";
    res.setHeader("x-request-id", req.id);
    next();
  });
  app.get("/boom", (_req, _res, next) => next(err));
  app.use(errorHandler);
  return app;
};

describe("WP2.1 — error handler", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  const silence = () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  };

  describe("HttpError", () => {
    it("passes the status and message through", async () => {
      silence();
      const res = await request(appThrowing(httpError(409, "Seat is taken"))).get(
        "/boom"
      );

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Seat is taken");
      // Kept alongside `message` for clients that read the old key.
      expect(res.body.error).toBe("Seat is taken");
    });

    it("includes the code when one is given", async () => {
      silence();
      const res = await request(
        appThrowing(httpError(410, "Hold expired", { code: "HOLD_EXPIRED" }))
      ).get("/boom");

      expect(res.body.code).toBe("HOLD_EXPIRED");
    });

    it("still exposes client-error detail in production", async () => {
      silence();
      process.env.NODE_ENV = "production";

      const res = await request(appThrowing(httpError(400, "Bad seat"))).get(
        "/boom"
      );

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Bad seat");
    });
  });

  describe("unexpected faults", () => {
    it("hides the detail in production", async () => {
      silence();
      process.env.NODE_ENV = "production";

      const leaky = new Error(
        'E11000 duplicate key error collection: ticketnest.users index: email_1 dup key: { email: "a@b.c" }'
      );

      const res = await request(appThrowing(leaky)).get("/boom");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Internal Server Error");
      expect(JSON.stringify(res.body)).not.toContain("E11000");
      expect(JSON.stringify(res.body)).not.toContain("ticketnest.users");
      expect(res.body.requestId).toBe("generated-test-request-id");
    });

    it("shows the detail outside production", async () => {
      silence();
      process.env.NODE_ENV = "development";

      const res = await request(appThrowing(new Error("something specific"))).get(
        "/boom"
      );

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("something specific");
    });

    it("never serializes a stack trace into the response", async () => {
      silence();
      process.env.NODE_ENV = "development";

      const res = await request(appThrowing(new Error("with stack"))).get("/boom");

      expect(JSON.stringify(res.body)).not.toContain("at ");
      expect(res.body.stack).toBeUndefined();
    });
  });

  describe("logging", () => {
    it("logs server faults at error level, once", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      await request(appThrowing(new Error("fault"))).get("/boom");

      expect(error).toHaveBeenCalledTimes(1);
      expect(warn).not.toHaveBeenCalled();
    });

    it("logs client errors at warn level, not error", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      await request(appThrowing(httpError(404, "Not found"))).get("/boom");

      expect(warn).toHaveBeenCalledTimes(1);
      expect(error).not.toHaveBeenCalled();
    });

    it("records the request path and status", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});

      await request(appThrowing(httpError(404, "Not found"))).get("/boom");

      const logged = JSON.parse(warn.mock.calls[0][0] as string);
      expect(logged).toMatchObject({
        method: "GET",
        path: "/boom",
        status: 404,
        requestId: "generated-test-request-id",
      });
    });

    it("redacts credentials and connection strings from messages and stacks", async () => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const secret = new Error(
        "mongodb+srv://app:private@cluster/test token=abc123 authorization: Bearer xyz"
      );

      await request(appThrowing(secret)).get("/boom");

      const logged = error.mock.calls.flat().join(" ");
      expect(logged).not.toContain("private");
      expect(logged).not.toContain("abc123");
      expect(logged).not.toContain("Bearer xyz");
      expect(logged).toContain("[REDACTED");
    });
  });
});
