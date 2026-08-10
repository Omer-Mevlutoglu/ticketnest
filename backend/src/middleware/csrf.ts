import { NextFunction, Request, Response } from "express";
import { doubleCsrf } from "csrf-csrf";
import { getConfig } from "../configs/env";
import { httpError } from "../utils/httpError";

/**
 * CSRF protection for cookie-backed sessions.
 *
 * In production this API runs on a different origin from the browser app, so
 * the session cookie is `SameSite=None`. That is precisely the configuration
 * SameSite would otherwise have protected, so two independent defences apply:
 *
 * 1. **Origin validation** — a state-changing request must declare an `Origin`
 *    (or `Referer`) on the CORS allowlist. Browsers always send `Origin` on
 *    cross-site writes, and a page on evil.example cannot forge it.
 * 2. **A double-submit token** — the client reads a token issued by
 *    `GET /api/csrf-token` and echoes it in `x-csrf-token`. Cross-site
 *    JavaScript cannot read the response, so it cannot produce the header.
 *
 * Layer 1 alone stops classic form-based CSRF; layer 2 covers the case where a
 * misconfigured CORS policy or a browser quirk lets a request through.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

declare module "express-session" {
  interface SessionData {
    /** Ensures the anonymous session used to sign a CSRF token is persisted. */
    csrfInitialized?: boolean;
  }
}

const normalize = (value: string): string => value.trim().replace(/\/$/, "");

/**
 * Rejects state-changing requests that do not come from an allowed origin.
 *
 * A request with no `Origin` and no `Referer` is allowed through: that is what
 * server-to-server callers and health checks look like, and they carry no
 * ambient cookie for an attacker to ride on. Browsers, which do, always send
 * one on a cross-site write.
 */
export const validateRequestOrigin = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const { corsOrigins } = getConfig();
  const origin = req.get("origin");
  const referer = req.get("referer");

  if (!origin && !referer) return next();

  const candidate = origin
    ? normalize(origin)
    : (() => {
        try {
          return normalize(new URL(referer as string).origin);
        } catch {
          return "";
        }
      })();

  if (candidate && corsOrigins.map(normalize).includes(candidate)) {
    return next();
  }

  return next(
    httpError(403, "Request origin is not allowed.", {
      code: "ORIGIN_NOT_ALLOWED",
    })
  );
};

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => getConfig().sessionSecret,
  // Ties a token to the session it was issued for, so one user's token cannot
  // be replayed against another's session.
  getSessionIdentifier: (req: Request) => req.sessionID ?? "",
  cookieName: "tn.x-csrf-token",
  cookieOptions: {
    sameSite: "none",
    secure: true,
    path: "/",
  },
  getCsrfTokenFromRequest: (req: Request) =>
    (req.headers["x-csrf-token"] as string | undefined) ?? "",
  errorConfig: {
    statusCode: 403,
    message: "Invalid or missing CSRF token.",
    code: "CSRF_INVALID",
  },
});

/** `GET /api/csrf-token` — issues a token and sets its paired cookie. */
export const issueCsrfToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // The HMAC includes req.sessionID. With saveUninitialized=false, merely
  // reading that ID does not set connect.sid, so the following write would get
  // a different session and reject an otherwise valid token. Touch and save a
  // harmless marker before generating the token so both requests share the ID.
  req.session.csrfInitialized = true;
  req.session.save((saveError) => {
    if (saveError) return next(saveError);

    try {
      return res.json({ csrfToken: generateCsrfToken(req, res) });
    } catch (error) {
      return next(error);
    }
  });
};

/**
 * Token validation for state-changing requests.
 *
 * Cookie attributes are fixed at module load, and `sameSite: "none"` requires
 * `secure: true`, which a plain-HTTP local dev server cannot set. Token
 * checking is therefore active in production and skipped in development and
 * test — where origin validation above still applies.
 */
export const csrfProtection = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!getConfig().isProduction) return next();
  return doubleCsrfProtection(req, res, (error?: unknown) => {
    if (!error) return next();

    const shaped = error as { code?: unknown };
    if (shaped?.code === "CSRF_INVALID") {
      return next(
        httpError(403, "Invalid or missing CSRF token.", {
          code: "CSRF_INVALID",
        })
      );
    }

    return next(error);
  });
};
