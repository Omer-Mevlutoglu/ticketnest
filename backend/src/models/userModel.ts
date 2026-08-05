import mongoose, { Schema, Document, model, Types } from "mongoose";

export interface IUser extends Document {
  // Declared explicitly: `Document` types `_id` as `unknown`, which forces a
  // cast at every call site that reads it.
  _id: Types.ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  emailVerified: boolean;
  isApproved: boolean;
  isSuspended?: boolean;
  favorites?: Types.ObjectId[];
  /**
   * Bumped whenever every existing session for this user must stop working:
   * password reset, suspension, or a privilege change. Sessions carry the
   * value they were created with and are rejected when it falls behind.
   */
  sessionVersion: number;
  /** Set on every password change; invalidates reset tokens issued earlier. */
  passwordChangedAt?: Date;
  /** Seeded admins must set their own password before doing anything else. */
  mustChangePassword?: boolean;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["attendee", "organizer", "admin"],
      default: "attendee",
    },
    emailVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
    favorites: [{ type: Schema.Types.ObjectId, ref: "Event", default: [] }],
    sessionVersion: { type: Number, default: 0, required: true },
    passwordChangedAt: { type: Date },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const userModel = mongoose.model<IUser>("User", userSchema);

export default userModel;
