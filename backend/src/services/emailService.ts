import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";
dotenv.config();
// SET THE API KEY
sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

// This MUST be an email you verified as a "Sender" in SendGrid
const FROM_EMAIL = "crowdjoy45@gmail.com";

export const sendVerificationEmail = async (email: string, token: string) => {
  const verifyLink = `http://localhost:5173/verify-email?token=${token}`;

  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: "CrowdJoy - Please Verify Your Email",
    html: `
      <h1>Welcome to CrowdJoy!</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verifyLink}" target="_blank">Verify My Email</a>
      <p>This link will expire in 1 hour.</p>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send verification email.");
  }
};

/**
 * Sends a pre-made password reset email
 */
export const sendPasswordResetEmail = async (email: string, token: string) => {
  const resetLink = `http://localhost:5173/reset-password?token=${token}`;

  const msg = {
    to: email,
    from: FROM_EMAIL,
    subject: "CrowdJoy - Password Reset Request",
    html: `
      <h1>Password Reset</h1>
      <p>You are receiving this because you (or someone else) requested a password reset.</p>
      <p>Click the link below to set a new password:</p>
      <a href="${resetLink}" target="_blank">Reset My Password</a>
      <p>This link will expire in 15 minutes.</p>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send password reset email.");
  }
};
