import { NextFunction, Request, Response } from "express";
import { isHttpError } from "../utils/httpError";
import { redactSensitive } from "../utils/redactSensitive";

/**
 * Single exit point for every error in the application.
 *
 * Two classes of error are treated differently:
 *
 * - `HttpError` — deliberate, with a status and a message written for the
 *   client. Passed through as-is.
 * - Anything else — a fault we did not anticipate (a Mongoose validation
 *   error, a driver failure, a `TypeError`). In production the client gets a
 *   generic 500 with no detail, because those messages leak schema names,
 *   connection strings, and stack frames.
 *
 * The error is logged exactly once, here, with request context.
 */
export default function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const expected = isHttpError(err);
  const status = expected ? err.status : 500;
  const isProduction = process.env.NODE_ENV === "production";

  // Client faults are noise at error level; server faults are not.
  const log = status >= 500 ? console.error : console.warn;
  const userId = (req.user as { _id?: unknown } | undefined)?._id;

  log(
    JSON.stringify({
      level: status >= 500 ? "error" : "warn",
      method: req.method,
      path: req.originalUrl,
      status,
      requestId: req.id,
      userId: userId ? String(userId) : undefined,
      message: redactSensitive(err instanceof Error ? err.message : err),
      ...(expected && err.code ? { code: err.code } : {}),
    }),
    // Stacks only for genuine faults, and never serialized into the response.
    status >= 500 && err instanceof Error
      ? redactSensitive(err.stack ?? err.message)
      : ""
  );

  if (res.headersSent) return;

  const publicMessage = (() => {
    if (expected) return err.message;
    if (isProduction) return "Internal Server Error";
    // Outside production, the real message is worth more than hiding it.
    return err instanceof Error ? err.message : String(err);
  })();

  res.status(status).json({
    message: publicMessage,
    // `error` is kept alongside `message` for clients that read the old key.
    error: publicMessage,
    ...(expected && err.code ? { code: err.code } : {}),
    ...(status >= 500 && req.id ? { requestId: req.id } : {}),
  });
}
