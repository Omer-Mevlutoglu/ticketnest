import mongoose, { Schema, Document, model, Types } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  emailVerified: boolean;
  isApproved: boolean;
  isSuspended?: boolean;
  favorites?: Types.ObjectId[];
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
  },
  { timestamps: true }
);

const userModel = mongoose.model<IUser>("User", userSchema);

export default userModel;
