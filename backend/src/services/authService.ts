import userModel, { IUser } from "../models/userModel";
import { hashPassword } from "../utils/helperHash";
import { Request } from "express";
import passport from "passport";
import { createApprovalRequest } from "./approvalService";
import { sendVerificationEmail } from "./emailService";
import jwt from "jsonwebtoken";
export interface RegisterDTO {
  username: string;
  email: string;
  password: string;
  role: "attendee" | "organizer";
}

// Arrow, async/await, checking both email & username, HTTP status on error
export const registerUser = async (userData: RegisterDTO) => {
  const { username, email, password, role } = userData;

  // 1) Check for existing email OR username
  const existingUser = await userModel.findOne({
    $or: [{ email }, { username }],
  });
  if (existingUser) {
    const err = new Error("Email or username already in use");
    // Attach HTTP status code for your error handler to pick up
    // @ts-ignore
    err.status = 409;
    throw err;
  }

  const passwordHash = await hashPassword(password);

  // If they ask to be organizer, we create them but mark pending:
  const isApproved = role === "attendee";

  const newUser = await userModel.create({
    username,
    email,
    passwordHash,
    role,
    emailVerified: false,
    isApproved: role === "attendee",
  });
  if (role === "organizer") {
    // Organizers are not approved by default
    await userModel.findByIdAndUpdate(newUser.id, { isApproved: false });
    await createApprovalRequest(newUser.id);
  }
  try {
    const emailToken = jwt.sign(
      { userId: newUser._id, intent: "verify-email" },
      process.env.EMAIL_VERIFY_TOKEN_SECRET as string,
      { expiresIn: "1h" } // Token expires in 1 hour
    );

    await sendVerificationEmail(newUser.email, emailToken);
  } catch (err) {
    console.error("Error sending verification email:", err);
    // This is a common issue. We'll still let the user be created,
    // but we can add a "Resend Verification" button later.
  }
  const { passwordHash: _, ...safeUser } = newUser.toObject();
  return safeUser;
};

export const logoutUser = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.logout((err) => {
      if (err) return reject(err);
      req.session?.destroy((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
};

export const getAllUsers = async () => {
  const users = await userModel
    .find({ role: { $ne: "admin" } })
    .select("-passwordHash")
    .lean()
    .exec();
  return users;
};
