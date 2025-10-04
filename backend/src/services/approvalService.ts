import ApprovalRequest, { IApprovalRequest } from "../models/approvalRequest";
import userModel from "../models/userModel";

/**
 * Create a pending ApprovalRequest for the given organizer.
 * If one already exists, returns the existing doc.
 */
export const createApprovalRequest = async (
  organizerId: string
): Promise<IApprovalRequest> => {
  const req = await ApprovalRequest.findOneAndUpdate(
    { organizerId },
    { $setOnInsert: { organizerId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return req;
};

/**
 * List all pending approval requests, populated with organizer info.
 */
export const getPendingRequests = async (): Promise<IApprovalRequest[]> => {
  return ApprovalRequest.find({ status: "pending" })
    .populate("organizerId", "username email role isApproved")
    .exec();
};

/**
 * Approve a request: mark both the ApprovalRequest and the User.
 */
export const approveRequest = async (
  organizerId: string
): Promise<IApprovalRequest | null> => {
  // 1) Mark user as approved
  await userModel.findByIdAndUpdate(organizerId, { isApproved: true });

  // 2) Update request status
  return ApprovalRequest.findOneAndUpdate(
    { organizerId },
    { status: "approved" },
    { new: true }
  ).exec();
};

/**
 * Reject a request: mark the ApprovalRequest as rejected.
 */
export const rejectRequest = async (
  organizerId: string
): Promise<IApprovalRequest | null> => {
  return ApprovalRequest.findOneAndUpdate(
    { organizerId },
    { status: "rejected" },
    { new: true }
  ).exec();
};
