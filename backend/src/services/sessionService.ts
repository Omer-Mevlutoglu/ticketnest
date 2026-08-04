import { Types } from "mongoose";
import userModel from "../models/userModel";

/**
 * Session invalidation.
 *
 * Sessions live in MongoDB and last fourteen days, so "log everyone out" cannot
 * mean "wait". Each user carries a `sessionVersion`; a session records the
 * value it was created with, and `rejectStaleSessions` refuses any session
 * whose recorded value has fallen behind.
 *
 * That makes invalidation a single atomic increment — no scanning the session
 * collection, no regex over serialized passport payloads, and it works
 * regardless of which store backs sessions later.
 */

export interface RevokeOptions {
  /** Also stamps `passwordChangedAt`, which invalidates older reset tokens. */
  passwordChanged?: boolean;
}

/**
 * Invalidates every existing session for a user.
 *
 * Returns the new version, or `null` if the user no longer exists.
 */
export const revokeUserSessions = async (
  userId: Types.ObjectId | string,
  options: RevokeOptions = {}
): Promise<number | null> => {
  const update: Record<string, unknown> = { $inc: { sessionVersion: 1 } };
  if (options.passwordChanged) {
    update.$set = { passwordChangedAt: new Date() };
  }

  const updated = await userModel
    .findByIdAndUpdate(userId, update, { new: true })
    .select("sessionVersion")
    .lean();

  return updated ? updated.sessionVersion : null;
};

/**
 * Whether a password-reset token is still usable.
 *
 * JWTs are stateless, so a reset link keeps working for its full lifetime even
 * after it has been used. Comparing the token's `iat` against
 * `passwordChangedAt` makes it single-use in practice: the first successful
 * reset moves the timestamp past every token issued before it.
 *
 * `iat` has second precision, so a token issued in the same second as the
 * previous change is treated as stale rather than risking a replay.
 */
export const isTokenIssuedBeforePasswordChange = (
  issuedAtSeconds: number | undefined,
  passwordChangedAt: Date | undefined | null
): boolean => {
  if (!passwordChangedAt) return false;
  if (typeof issuedAtSeconds !== "number") return true;

  const issuedAtMs = issuedAtSeconds * 1000;
  const changedAtSecond = Math.floor(passwordChangedAt.getTime() / 1000) * 1000;

  return issuedAtMs <= changedAtSecond;
};
