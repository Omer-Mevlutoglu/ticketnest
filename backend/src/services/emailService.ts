import sgMail from "@sendgrid/mail";
import { getConfig } from "../configs/env";

/**
 * Transactional email.
 *
 * Both the sender address and the link origin come from validated config, so a
 * deployment cannot silently email `localhost` links to real users — the
 * process refuses to start without `FRONTEND_URL` in production.
 *
 * The SendGrid client is configured lazily on first send rather than at import,
 * so importing this module never requires an API key (tests, CLI scripts).
 */
let configured = false;

const client = () => {
  const config = getConfig();
  if (!configured) {
    sgMail.setApiKey(config.sendgridApiKey);
    configured = true;
  }
  return config;
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const { frontendUrl, fromEmail } = client();
  const verifyLink = `${frontendUrl}/verify-email?token=${token}`;

  const msg = {
    to: email,
    from: fromEmail,
    subject: "TicketNest - Please Verify Your Email",
    html: `
      <h1>Welcome to TicketNest!</h1>
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
  const { frontendUrl, fromEmail } = client();
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  const msg = {
    to: email,
    from: fromEmail,
    subject: "TicketNest - Password Reset Request",
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
