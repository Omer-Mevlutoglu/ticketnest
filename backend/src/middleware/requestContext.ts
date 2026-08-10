import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Correlates every log line produced while handling this request. */
      id: string;
    }
  }
}

/**
 * Gives every request an id and logs how it finished.
 *
 * The id is echoed in the `x-request-id` response header, so a user reporting
 * "my booking failed" can hand over one string that finds the exact request in
 * the logs — including the error the global handler recorded under the same id.
 *
 * An inbound `x-request-id` is honoured when it looks safe, which keeps the
 * trail intact if a proxy or another service already assigned one.
 */

const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

/** Paths that would otherwise fill the log with noise. */
const QUIET_PATHS = new Set(["/healthz", "/readyz"]);

export const requestContext = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const inbound = req.get("x-request-id");
  req.id = inbound && SAFE_ID.test(inbound) ? inbound : randomUUID();
  res.setHeader("x-request-id", req.id);

  const startedAt = process.hrtime.bigint();

  // `finish` fires once the response is flushed, so the status and duration
  // are the real ones rather than what a handler intended.
  res.on("finish", () => {
    if (QUIET_PATHS.has(req.path)) return;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const userId = (req.user as { _id?: unknown } | undefined)?._id;

    console.log(
      JSON.stringify({
        level: res.statusCode >= 500 ? "error" : "info",
        event: "http.request",
        requestId: req.id,
        method: req.method,
        // `route.path` keeps ids out of the log, so requests can be grouped:
        // "/api/events/:id" rather than a million distinct paths.
        path: req.route?.path ? req.baseUrl + req.route.path : req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
        userId: userId ? String(userId) : undefined,
      })
    );
  });

  next();
};
