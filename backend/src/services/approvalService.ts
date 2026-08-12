import mongoose, { Types } from "mongoose";
import ApprovalRequest, { IApprovalRequest } from "../models/approvalRequest";
import { recordAudit } from "../models/auditLogModel";
import userModel from "../models/userModel";
import { httpError } from "../utils/httpError";

/** Create the single approval record owned by an organizer. */
export const createApprovalRequest = async (
  organizerId: string
): Promise<IApprovalRequest> => {
  const request = await ApprovalRequest.findOneAndUpdate(
    { organizerId },
    { $setOnInsert: { organizerId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return request;
};

export const getPendingRequests = async (): Promise<IApprovalRequest[]> =>
  ApprovalRequest.find({ status: "pending" })
    .populate("organizerId", "username email role isApproved isDemoAccount")
    .exec();

interface SetOrganizerApprovalInput {
  organizerId: string;
  actorId: string;
  isApproved: boolean;
  /** The pending-review endpoints cannot reverse a completed decision. */
  requirePending?: boolean;
}

/**
 * Keeps the user's privilege, approval request and audit trail atomic.
 *
 * Retrying the same decision is intentionally a no-op. A competing opposite
 * decision through the pending queue receives a conflict instead of silently
 * overwriting the first administrator's work.
 */
export const setOrganizerApproval = async ({
  organizerId,
  actorId,
  isApproved,
  requirePending = false,
}: SetOrganizerApprovalInput): Promise<IApprovalRequest> => {
  if (!Types.ObjectId.isValid(organizerId)) {
    throw httpError(400, "Invalid organizer ID.");
  }

  const desiredStatus = isApproved ? "approved" : "rejected";
  const session = await mongoose.startSession();
  let result: IApprovalRequest | null = null;

  try {
    await session.withTransaction(async () => {
      const organizer = await userModel.findById(organizerId).session(session);
      if (!organizer) throw httpError(404, "Organizer not found.");
      if (organizer.role !== "organizer") {
        throw httpError(400, "Approval can only be changed for organizers.");
      }

      let approval = await ApprovalRequest.findOne({ organizerId }).session(
        session
      );
      if (!approval) {
        if (requirePending) throw httpError(404, "Request not found.");
        [approval] = await ApprovalRequest.create(
          [{ organizerId, status: "pending" }],
          { session }
        );
      }

      if (
        requirePending &&
        approval.status !== "pending" &&
        approval.status !== desiredStatus
      ) {
        throw httpError(409, "This approval request was already decided.", {
          code: "APPROVAL_ALREADY_DECIDED",
        });
      }

      const previousStatus = approval.status;
      const previousApproval = organizer.isApproved;
      const requestChanged = previousStatus !== desiredStatus;
      const userChanged = previousApproval !== isApproved;

      if (requestChanged) {
        const requestUpdate = await ApprovalRequest.updateOne(
          { _id: approval._id, status: previousStatus },
          { $set: { status: desiredStatus } },
          { session }
        );
        if (requestUpdate.modifiedCount !== 1) {
          throw httpError(409, "Approval changed in another request. Try again.", {
            code: "APPROVAL_CHANGE_CONFLICT",
          });
        }
      }

      if (userChanged) {
        const userUpdate = await userModel.updateOne(
          { _id: organizer._id, isApproved: previousApproval },
          {
            $set: { isApproved },
            $inc: { sessionVersion: 1 },
          },
          { session }
        );
        if (userUpdate.modifiedCount !== 1) {
          throw httpError(409, "Approval changed in another request. Try again.", {
            code: "APPROVAL_CHANGE_CONFLICT",
          });
        }
      }

      if (requestChanged || userChanged) {
        await recordAudit(
          {
            action: "user.approval_changed",
            actorId,
            targetType: "user",
            targetId: organizer._id,
            metadata: {
              previousApproval,
              isApproved,
              previousStatus,
              status: desiredStatus,
            },
          },
          { session, throwOnError: true }
        );
      }

      result = await ApprovalRequest.findById(approval._id).session(session);
    });
  } finally {
    await session.endSession();
  }

  if (!result) throw new Error("Approval transaction completed without a result.");
  return result;
};

export const approveRequest = (organizerId: string, actorId: string) =>
  setOrganizerApproval({
    organizerId,
    actorId,
    isApproved: true,
    requirePending: true,
  });

export const rejectRequest = (organizerId: string, actorId: string) =>
  setOrganizerApproval({
    organizerId,
    actorId,
    isApproved: false,
    requirePending: true,
  });
