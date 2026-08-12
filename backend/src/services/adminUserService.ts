import mongoose, { Types } from "mongoose";
import { recordAudit } from "../models/auditLogModel";
import userModel, { IUser } from "../models/userModel";
import { httpError } from "../utils/httpError";
import { setOrganizerApproval } from "./approvalService";

const PUBLIC_FIELDS = "-passwordHash";

const requireValidId = (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw httpError(400, "Invalid user ID");
  }
};

/** Change an organizer privilege and its approval record in one transaction. */
export const setUserApproval = async (
  userId: string,
  isApproved: boolean,
  actorId: string
): Promise<IUser> => {
  requireValidId(userId);
  await setOrganizerApproval({ organizerId: userId, actorId, isApproved });

  const user = await userModel.findById(userId).select(PUBLIC_FIELDS).exec();
  if (!user) throw httpError(404, "User not found.");
  return user;
};

/**
 * Suspension changes and their audit rows commit together. Both directions
 * revoke all existing sessions; lifting a suspension must not revive an old
 * authenticated session.
 */
export const setUserSuspension = async (
  userId: string,
  isSuspended: boolean,
  actorId: string
): Promise<IUser> => {
  requireValidId(userId);

  const session = await mongoose.startSession();
  let result: IUser | null = null;
  try {
    await session.withTransaction(async () => {
      const user = await userModel.findById(userId).session(session);
      if (!user) throw httpError(404, "User not found.");

      if (Boolean(user.isSuspended) !== isSuspended) {
        const update = await userModel.updateOne(
          { _id: user._id, isSuspended: user.isSuspended },
          {
            $set: { isSuspended },
            $inc: { sessionVersion: 1 },
          },
          { session }
        );
        if (update.modifiedCount !== 1) {
          throw httpError(409, "Suspension changed in another request. Try again.", {
            code: "SUSPENSION_CHANGE_CONFLICT",
          });
        }

        await recordAudit(
          {
            action: isSuspended ? "user.suspended" : "user.unsuspended",
            actorId,
            targetType: "user",
            targetId: user._id,
            metadata: { previousSuspended: user.isSuspended, isSuspended },
          },
          { session, throwOnError: true }
        );
      }

      result = await userModel
        .findById(userId)
        .select(PUBLIC_FIELDS)
        .session(session);
    });
  } finally {
    await session.endSession();
  }

  if (!result) throw new Error("Suspension transaction completed without a result.");
  return result;
};
