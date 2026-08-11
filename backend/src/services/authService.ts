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

const createVerificationToken = (userId: unknown): string =>
  jwt.sign(
    { userId, intent: "verify-email" },
    getConfig().emailVerifyTokenSecret,
    { expiresIn: "1h" }
  );

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

  let verificationEmailSent = false;
  if (emailEnabled) {
    try {
      verificationEmailSent = await sendVerificationEmail(
        newUser.email,
        createVerificationToken(newUser._id)
      );
    } catch (err) {
      // The account exists either way; a delivery failure must not lose it.
      console.error("Error sending verification email:", err);
    }
  }

  const {
    passwordHash: _,
    isSystemAdmin: _systemAdmin,
    isDemoAccount: _demoAccount,
    ...safeUser
  } = newUser.toObject();

  // Tells the client whether to say "check your inbox" or send them to sign in.
  return {
    ...safeUser,
    verificationEmailSent,
    emailVerificationRequired: emailEnabled,
  };
};

/**
 * Attempts verification delivery without revealing whether the account exists.
 * The route always returns the same accepted response; provider failures are
 * logged so the user can safely retry later.
 */
export const resendVerificationEmail = async (email: string): Promise<void> => {
  if (!isEmailEnabled()) {
    throw httpError(
      503,
      "Email verification is unavailable: this deployment has email delivery switched off.",
      { code: "EMAIL_DISABLED" }
    );
  }

  const user = await userModel.findOne({
    email,
    emailVerified: false,
    isSuspended: { $ne: true },
  });

  if (!user) return;

  try {
    await sendVerificationEmail(
      user.email,
      createVerificationToken(user._id)
    );
  } catch (error) {
    // Returning provider status here would reveal which addresses are users.
    // Keep the public response generic and let the account retry later.
    console.error("Error resending verification email:", error);
  }
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
