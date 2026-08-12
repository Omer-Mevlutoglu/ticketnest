import mongoose, { Document, Schema, Types } from "mongoose";
import { redactSensitive } from "../utils/redactSensitive";

/**
 * A record of consequential actions.
 *
 * An admin panel that can suspend accounts, approve organizers, and remove
 * venues needs to be able to answer "who did this, and when". Without it the
 * only evidence an action happened is the changed row itself.
 *
 * Append-only by convention: nothing in the codebase updates or deletes these.
 */

export type AuditAction =
  | "venue.disabled"
  | "venue.delete_blocked"
  | "event.cancelled"
  | "event.cancellation_notification"
  | "user.suspended"
  | "user.unsuspended"
  | "user.approval_changed";

export interface IAuditLog extends Document {
  action: AuditAction;
  /** Who performed it. Absent for system actions such as the expiry sweep. */
  actorId?: Types.ObjectId;
  /** What it was performed on. */
  targetType: "venue" | "event" | "user" | "booking";
  targetId: Types.ObjectId;
  /** Action-specific detail — counts, previous values, reasons. */
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// The two questions actually asked of an audit log: what happened recently,
// and what has ever happened to this thing.
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const auditLogModel = mongoose.model<IAuditLog>(
  "AuditLog",
  auditLogSchema
);

export interface RecordAuditInput {
  action: AuditAction;
  actorId?: Types.ObjectId | string;
  targetType: IAuditLog["targetType"];
  targetId: Types.ObjectId | string;
  metadata?: Record<string, unknown>;
}

export interface RecordAuditOptions {
  /** Include the audit row in the caller's transaction. */
  session?: mongoose.ClientSession;
  /** Atomic workflows must fail, not silently commit without their audit row. */
  throwOnError?: boolean;
}

/**
 * Writes an audit entry.
 *
 * Best-effort by default: a failure is logged and swallowed. Atomic workflows
 * can opt into `throwOnError` so their transaction cannot commit without its
 * required audit row.
 */
export const recordAudit = async (
  input: RecordAuditInput,
  options: RecordAuditOptions = {}
): Promise<void> => {
  try {
    const document = {
      action: input.action,
      actorId: input.actorId ? new Types.ObjectId(input.actorId) : undefined,
      targetType: input.targetType,
      targetId: new Types.ObjectId(input.targetId),
      metadata: input.metadata,
    };

    if (options.session) {
      await auditLogModel.create([document], { session: options.session });
    } else {
      await auditLogModel.create(document);
    }
  } catch (err) {
    if (options.throwOnError) throw err;

    console.error(
      JSON.stringify({
        level: "error",
        event: "audit.write_failed",
        action: input.action,
        message: redactSensitive(err instanceof Error ? err.message : err),
      })
    );
  }
};
