import mongoose, { Schema, Document } from "mongoose";

export interface IApprovalRequest extends Document {
  organizerId: mongoose.Types.ObjectId;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const approvalRequestSchema = new Schema<IApprovalRequest>(
  {
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one request per organizer
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const ApprovalRequest = mongoose.model<IApprovalRequest>(
  "ApprovalRequest",
  approvalRequestSchema
);

export default ApprovalRequest;
