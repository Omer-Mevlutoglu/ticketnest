import { NextFunction, Request, Response } from "express";
import { ZodError, ZodType } from "zod";
import { httpError } from "../utils/httpError";

/**
 * Schema validation at the HTTP boundary.
 *
 * Replaces the hand-rolled `validateBody`, which supported four rule types, was
 * wired to two routes, and produced a type nothing checked. A schema here gives
 * the runtime check and the TypeScript type from one definition, and the parsed
 * result replaces `req.body` — so handlers receive coerced, trimmed, key-checked
 * data rather than whatever arrived.
 */

/** Turns Zod's issue list into one readable sentence per field. */
const toMessage = (err: ZodError): string =>
  err.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");

const makeValidator =
  (source: "body" | "query" | "params") =>
  <T>(schema: ZodType<T>) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return next(
        httpError(400, toMessage(result.error), { code: "VALIDATION_FAILED" })
      );
    }

    // Express 5 makes req.query a getter, so it cannot be reassigned; the
    // parsed value is exposed separately for those.
    if (source === "query") {
      (req as Request & { validatedQuery?: unknown }).validatedQuery =
        result.data;
    } else {
      req[source] = result.data as never;
    }

    return next();
  };

export const validateBody = makeValidator("body");
export const validateParams = makeValidator("params");
export const validateQuery = makeValidator("query");

/** Reads what `validateQuery` parsed. */
export const validatedQuery = <T>(req: Request): T =>
  (req as Request & { validatedQuery: T }).validatedQuery;
