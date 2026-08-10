import sgMail from "@sendgrid/mail";
import { getConfig } from "../configs/env";
import { isEmailEnabled } from "../configs/features";

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

/**
 * Sends a message, or does nothing when email is switched off.
 *
 * Returns whether it was actually dispatched, so callers can adapt — the
 * signup path uses it to decide between "check your inbox" and verifying
 * immediately.
 */
const dispatch = async (
  msg: { to: string; from: string; subject: string; html: string },
  description: string
): Promise<boolean> => {
  if (!isEmailEnabled()) {
    console.log(
      `✉️  Skipped ${description} to ${msg.to} — ENABLE_EMAIL is off.`
    );
    return false;
  }

  try {
    await sgMail.send(msg);
    console.log(`${description} sent to ${msg.to}`);
    return true;
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error(`Failed to send ${description}.`);
  }
};

export const sendVerificationEmail = async (
  email: string,
  token: string
): Promise<boolean> => {
  const { frontendUrl, fromEmail } = client();
  const verifyLink = `${frontendUrl}/verify-email?token=${token}`;

  return dispatch(
    {
      to: email,
      from: fromEmail,
      subject: "TicketNest - Please Verify Your Email",
      html: `
      <h1>Welcome to TicketNest!</h1>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verifyLink}" target="_blank">Verify My Email</a>
      <p>This link will expire in 1 hour.</p>
    `,
    },
    "verification email"
  );
};

/**
 * Sends a pre-made password reset email
 */
/** Tells a ticket holder their event is off. */
export const sendEventCancelledEmail = async (
  email: string,
  eventTitle: string
): Promise<boolean> => {
  const { frontendUrl, fromEmail } = client();

  return dispatch(
    {
      to: email,
      from: fromEmail,
      subject: `TicketNest - "${eventTitle}" has been cancelled`,
      html: `
      <h1>Your event has been cancelled</h1>
      <p>The organizer has cancelled <strong>${eventTitle}</strong>, and your booking has been cancelled with it.</p>
      <p>Your seats have been released. No further action is needed.</p>
      <p><a href="${frontendUrl}/my-bookings" target="_blank">View your bookings</a></p>
    `,
    },
    "event cancellation email"
  );
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string
): Promise<boolean> => {
  const { frontendUrl, fromEmail } = client();
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;

  return dispatch(
    {
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
    },
    "password reset email"
  );
};
