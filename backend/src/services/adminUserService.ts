import { Types } from "mongoose";
import userModel, { IUser } from "../models/userModel";
import { httpError } from "../utils/httpError";

/**
 * Admin operations on user accounts.
 *
 * These lived as inline handlers in `adminRoutes.ts`, talking to the model
 * directly while the rest of the codebase went routes → controllers → services.
 * Rules like "suspension must end live sessions" belong here, at the service
 * boundary, so they hold no matter which route reaches them.
 */

const PUBLIC_FIELDS = "-passwordHash";

const requireValidId = (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw httpError(400, "Invalid user ID");
  }
};

/**
 * Grants or withdraws approval.
 *
 * Withdrawing it is a privilege removal, so existing sessions end. Granting it
 * is not — there is no reason to sign someone out at the moment they gain
 * access.
 */
export const setUserApproval = async (
  userId: string,
  isApproved: boolean
): Promise<IUser> => {
  requireValidId(userId);

  const updated = await userModel
    .findByIdAndUpdate(
      userId,
      {
        $set: { isApproved },
        ...(isApproved ? {} : { $inc: { sessionVersion: 1 } }),
      },
      { new: true, select: PUBLIC_FIELDS }
    )
    .exec();

  if (!updated) throw httpError(404, "User not found.");
  return updated;
};

/**
 * Suspends or reinstates an account.
 *
 * Both directions bump `sessionVersion`. Suspension has to take effect now
 * rather than at the user's next login — up to fourteen days away — and
 * lifting it must not resurrect the sessions that were open when it was
 * applied.
 */
export const setUserSuspension = async (
  userId: string,
  isSuspended: boolean
): Promise<IUser> => {
  requireValidId(userId);

  const updated = await userModel
    .findByIdAndUpdate(
      userId,
      { $set: { isSuspended }, $inc: { sessionVersion: 1 } },
      { new: true, select: PUBLIC_FIELDS }
    )
    .exec();

  if (!updated) throw httpError(404, "User not found.");
  return updated;
};
