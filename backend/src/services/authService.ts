import userModel, { IUser } from "../models/userModel";
import { hashPassword } from "../utils/helperHash";
import { Request } from "express";
import passport from "passport";

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
    ...(role === "organizer" && { isApproved: false }),
  });
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
