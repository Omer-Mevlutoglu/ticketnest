import { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/httpError";

declare module "express-session" {
  interface SessionData {
    /** `sessionVersion` of the user at the time this session was created. */
    sessionVersion?: number;
  }
}

/**
 * Drops sessions that were issued before the user's credentials or privileges
 * changed.
 *
 * Runs immediately after `passport.session()`, so every downstream handler can
 * assume `req.user` belongs to a session that is still valid. A suspended user
 * is rejected here too — otherwise suspension only takes effect at their next
 * login, up to fourteen days away.
 */
export const rejectStaleSessions = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = req.user as
    | { sessionVersion?: number; isSuspended?: boolean }
    | undefined;

  if (!user) return next();

  const currentVersion = user.sessionVersion ?? 0;
  // Sessions created before this field existed are treated as version 0.
  const sessionVersion = req.session?.sessionVersion ?? 0;
  const suspended = user.isSuspended === true;

  if (!suspended && sessionVersion === currentVersion) return next();

  req.logout((logoutErr) => {
    if (logoutErr) return next(logoutErr);

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      next(
        suspended
          ? httpError(403, "This account has been suspended.", {
              code: "ACCOUNT_SUSPENDED",
            })
          : httpError(
              401,
              "Your session has ended. Please sign in again.",
              { code: "SESSION_REVOKED" }
            )
      );
    });
  });
};
