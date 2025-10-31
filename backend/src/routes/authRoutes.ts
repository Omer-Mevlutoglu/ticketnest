import { Router } from "express";
import { register, login, logout } from "../controllers/authController";
import { validateBody } from "../middleware/validateBody";
import userModel from "../models/userModel";
import jwt from "jsonwebtoken";
import { hashPassword } from "../utils/helperHash";
import { sendPasswordResetEmail } from "../services/emailService";
const router = Router();

router.post(
  "/register",
  validateBody([
    { field: "username", type: "string" },
    { field: "email", type: "email" },
    { field: "password", type: "minLength", length: 6 },
    { field: "role", type: "enum", options: ["attendee", "organizer"] },
  ]),
  register
);

router.post(
  "/login",
  validateBody([
    { field: "email", type: "email" },
    { field: "password", type: "string" },
  ]),
  login
);

router.post("/verify-email", async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token is required." });
    }

    // 1. Verify the token
    const payload: any = jwt.verify(
      token,
      process.env.EMAIL_VERIFY_TOKEN_SECRET as string
    );

    // 2. Check intent
    if (payload.intent !== "verify-email") {
      return res.status(400).json({ message: "Invalid token." });
    }

    // 3. Find user and update
    const user = await userModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (user.emailVerified) {
      return res.status(200).json({ message: "Email already verified." });
    }

    user.emailVerified = true;
    await user.save();

    res
      .status(200)
      .json({ message: "Email verified successfully. You can now log in." });
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(400)
        .json({ message: "Token expired. Please request a new link." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid token." });
    }
    next(err);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email });

    // IMPORTANT: For security, always return a success message
    // This prevents attackers from "fishing" for valid emails.
    if (user) {
      // Create a short-lived token
      const resetToken = jwt.sign(
        { userId: user._id, intent: "reset-password" },
        process.env.PASSWORD_RESET_TOKEN_SECRET as string,
        { expiresIn: "15m" } // 15 minute expiry
      );

      // Send the email
      await sendPasswordResetEmail(user.email, resetToken);
    }

    res.status(200).json({
      message:
        "If an account with that email exists, a reset link has been sent.",
    });
  } catch (err) {
    next(err);
  }
});

// --- 3. ADD RESET PASSWORD ROUTE ---
// POST /api/auth/reset-password
router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and new password are required." });
    }

    // 1. Verify the token
    const payload: any = jwt.verify(
      token,
      process.env.PASSWORD_RESET_TOKEN_SECRET as string
    );

    // 2. Check intent
    if (payload.intent !== "reset-password") {
      return res.status(400).json({ message: "Invalid token." });
    }

    // 3. Find user and update password
    const user = await userModel.findById(payload.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 4. Check for suspended user
    if (user.isSuspended) {
      return res.status(403).json({ message: "Account is suspended." });
    }

    // 5. Hash and save new password
    user.passwordHash = await hashPassword(password);
    await user.save();

    res
      .status(200)
      .json({ message: "Password reset successfully. You can now log in." });
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(400).json({
        message: "Password reset link has expired. Please request a new one.",
      });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid token." });
    }
    next(err);
  }
});
// optional
router.post("/logout", logout);

export default router;
