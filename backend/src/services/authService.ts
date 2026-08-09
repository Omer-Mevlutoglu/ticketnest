import userModel, { IUser } from "../models/userModel";
import { hashPassword } from "../utils/helperHash";
import { Request } from "express";
import passport from "passport";
import { createApprovalRequest } from "./approvalService";
import { sendVerificationEmail } from "./emailService";
import jwt from "jsonwebtoken";
import { httpError } from "../utils/httpError";
import { paginate } from "../utils/pagination";
import { getConfig } from "../configs/env";
import { isEmailEnabled } from "../configs/features";

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
    throw httpError(409, "Email or username already in use");
  }

  const passwordHash = await hashPassword(password);

  // With email switched off there is no way to deliver a verification link,
  // and the login strategy refuses unverified accounts — so the account would
  // be permanently unusable. Verify it up front instead.
  const emailEnabled = isEmailEnabled();

  const newUser = await userModel.create({
    username,
    email,
    passwordHash,
    role,
    emailVerified: !emailEnabled,
    isApproved: role === "attendee",
  });

  if (role === "organizer") {
    // Organizers are not approved by default
    await userModel.findByIdAndUpdate(newUser.id, { isApproved: false });
    await createApprovalRequest(newUser.id);
  }

  if (emailEnabled) {
    try {
      const emailToken = jwt.sign(
        { userId: newUser._id, intent: "verify-email" },
        getConfig().emailVerifyTokenSecret,
        { expiresIn: "1h" }
      );

      await sendVerificationEmail(newUser.email, emailToken);
    } catch (err) {
      // The account exists either way; a delivery failure must not lose it.
      console.error("Error sending verification email:", err);
    }
  }

  const { passwordHash: _, ...safeUser } = newUser.toObject();

  // Tells the client whether to say "check your inbox" or send them to sign in.
  return { ...safeUser, verificationEmailSent: emailEnabled };
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

export const getAllUsers = async (pagination: {
  page: number;
  limit: number;
}) =>
  paginate(userModel, {
    filter: { role: { $ne: "admin" } },
    ...pagination,
    sort: { createdAt: -1 },
    select: "-passwordHash",
  });
