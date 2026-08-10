import { Router } from "express";
import { register, login, logout } from "../controllers/authController";
import { validateBody } from "../middleware/validate";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../validation/schemas";
import userModel from "../models/userModel";
import jwt from "jsonwebtoken";
import { hashPassword } from "../utils/helperHash";
import { sendPasswordResetEmail } from "../services/emailService";
import { getConfig } from "../configs/env";
import { httpError } from "../utils/httpError";
import { isEmailEnabled } from "../configs/features";
import {
  isTokenIssuedBeforePasswordChange,
  revokeUserSessions,
} from "../services/sessionService";
import {
  forgotPasswordLimiter,
  loginLimiter,
  registerLimiter,
  resendVerificationLimiter,
  tokenLimiter,
} from "../middleware/rateLimiters";
import { resendVerificationEmail } from "../services/authService";

const router = Router();

/** Turns a jsonwebtoken failure into a 400 the client can act on. */
const asTokenError = (err: unknown, expiredMessage: string) => {
  const name = (err as { name?: string })?.name;
  if (name === "TokenExpiredError") return httpError(400, expiredMessage);
  if (name === "JsonWebTokenError" || name === "NotBeforeError") {
    return httpError(400, "Invalid token.");
  }
  return err;
};

router.post(
  "/register",
  registerLimiter,
  validateBody(registerSchema),
  register
);

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  login
);

router.post(
  "/verify-email",
  tokenLimiter,
  validateBody(verifyEmailSchema),
  async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) throw httpError(400, "Token is required.");

    let payload: any;
    try {
      payload = jwt.verify(token, getConfig().emailVerifyTokenSecret);
    } catch (err) {
      throw asTokenError(err, "Token expired. Please request a new link.");
    }

    if (payload.intent !== "verify-email") {
      throw httpError(400, "Invalid token.");
    }

    // Conditional update: `emailVerified: false` in the filter makes this
    // single-use, so a replayed link cannot re-verify a later-changed address.
    const result = await userModel.updateOne(
      { _id: payload.userId, emailVerified: false },
      { $set: { emailVerified: true } }
    );

    if (result.matchedCount === 0) {
      const user = await userModel.findById(payload.userId).lean();
      if (!user) throw httpError(404, "User not found.");
      return res.status(200).json({ message: "Email already verified." });
    }

    res
      .status(200)
      .json({ message: "Email verified successfully. You can now log in." });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validateBody(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      // Without a delivery channel there is no way to complete this flow. Say
      // so plainly rather than pretending a link was sent — the UI hides the
      // entry point too, so reaching here means a direct API call.
      if (!isEmailEnabled()) {
        throw httpError(
          503,
          "Password reset is unavailable: this deployment has email delivery switched off.",
          { code: "EMAIL_DISABLED" }
        );
      }

      const { email } = req.body;
      const user = await userModel.findOne({ email });

      // Always the same response: revealing which addresses exist turns this
      // endpoint into an account-enumeration oracle.
      if (user) {
        const resetToken = jwt.sign(
          { userId: user._id, intent: "reset-password" },
          getConfig().passwordResetTokenSecret,
          { expiresIn: "15m" }
        );

        await sendPasswordResetEmail(user.email, resetToken);
      }

      res.status(200).json({
        message:
          "If an account with that email exists, a reset link has been sent.",
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/resend-verification",
  resendVerificationLimiter,
  validateBody(resendVerificationSchema),
  async (req, res, next) => {
    try {
      await resendVerificationEmail(req.body.email);
      res.status(202).json({
        message:
          "If an unverified account with that email exists, a new verification link will be sent.",
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/reset-password",
  tokenLimiter,
  validateBody(resetPasswordSchema),
  async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      throw httpError(400, "Token and new password are required.");
    }

    let payload: any;
    try {
      payload = jwt.verify(token, getConfig().passwordResetTokenSecret);
    } catch (err) {
      throw asTokenError(
        err,
        "Password reset link has expired. Please request a new one."
      );
    }

    if (payload.intent !== "reset-password") {
      throw httpError(400, "Invalid token.");
    }

    const user = await userModel.findById(payload.userId);
    if (!user) throw httpError(404, "User not found.");
    if (user.isSuspended) throw httpError(403, "Account is suspended.");

    // A reset JWT stays cryptographically valid for its full 15 minutes even
    // after it has been used. Rejecting tokens issued at or before the last
    // password change makes each link effectively single-use.
    if (isTokenIssuedBeforePasswordChange(payload.iat, user.passwordChangedAt)) {
      throw httpError(
        400,
        "This reset link has already been used. Please request a new one."
      );
    }

    user.passwordHash = await hashPassword(password);
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    await user.save();

    // Changing a password must end every session opened with the old one —
    // otherwise resetting to lock an attacker out leaves them logged in.
    await revokeUserSessions(user._id as never, { passwordChanged: true });

    res.status(200).json({
      message:
        "Password reset successfully. You have been signed out everywhere. You can now log in.",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", logout);

export default router;
