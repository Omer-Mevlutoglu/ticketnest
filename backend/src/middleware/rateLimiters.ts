import rateLimit, { ipKeyGenerator, Options } from "express-rate-limit";
import { Request } from "express";

/**
 * Rate limits for the endpoints worth attacking.
 *
 * Deliberately per-endpoint rather than one limit across `/api/auth`: a shared
 * budget lets a burst of forgotten-password attempts lock a legitimate user out
 * of signing in, and the sensible ceiling for login is nothing like the one for
 * registration.
 *
 * `app.set("trust proxy", 1)` is already configured, so `req.ip` is the real
 * client address behind the single deployment proxy rather than the proxy's.
 */

const base: Partial<Options> = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // The same response regardless of whether the account exists: a limiter that
  // only trips for real accounts is itself an enumeration oracle.
  message: {
    message: "Too many attempts. Please try again later.",
    error: "Too many attempts. Please try again later.",
    code: "RATE_LIMITED",
  },
};

/**
 * Anonymous limits are per normalized IP; authenticated limits can use the
 * stable user id so IPv6 rotation and shared networks do not distort them.
 *
 * `DISABLE_RATE_LIMITS` exists so the integration suite — which drives hundreds
 * of requests from 127.0.0.1 — is not throttled by its own traffic. It is
 * checked per request, so the rate-limit tests can switch it off for the cases
 * that need real enforcement. It has no effect in production, where the
 * variable is not set.
 */
export const areRateLimitsDisabled = (): boolean =>
  process.env.NODE_ENV !== "production" &&
  process.env.DISABLE_RATE_LIMITS === "true";

export const rateLimitKey = (req: Request): string => {
  const userId = (req.user as { _id?: unknown } | undefined)?._id;
  return userId
    ? `user:${String(userId)}`
    : `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
};

const make = (options: Partial<Options>) =>
  rateLimit({
    ...base,
    ...options,
    skip: areRateLimitsDisabled,
  });

/** Credential stuffing is the threat; 10 tries per 15 minutes is generous. */
export const loginLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

/** Slows bulk account creation without blocking a household or an office. */
export const registerLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

/** Each attempt sends real email, so this one protects spend and reputation. */
export const forgotPasswordLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

/** Protects provider spend while keeping the response non-enumerating. */
export const resendVerificationLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 5,
});

/** Verification and reset token submissions — guards against token guessing. */
export const tokenLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

/** A stolen session must not provide unlimited guesses at the current password. */
export const passwordChangeLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: rateLimitKey,
});

/**
 * A wide backstop for everything else. High enough that ordinary authenticated
 * browsing never notices it.
 */
export const globalLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  // Authenticated users get their own budget rather than sharing one with
  // everybody behind the same NAT.
  keyGenerator: rateLimitKey,
});
