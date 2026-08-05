import type { IUser } from "../models/userModel";

/**
 * Teaches Express what `req.user` is.
 *
 * Passport declares `Express.User` as an empty interface, so every handler that
 * needed the id, role, or approval state reached for `(req.user as any)`.
 * Merging our own user document into that interface makes those casts
 * unnecessary and means a typo in a field name is a compile error.
 *
 * `req.user` stays optional — it is undefined until `ensureAuth` has run.
 */
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends IUser {}
  }
}

export {};
