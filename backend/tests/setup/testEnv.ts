/**
 * Test-only environment defaults.
 *
 * Loaded before any application module so that import-time reads
 * (`SESSION_SECRET`, `SENDGRID_API_KEY`, JWT secrets) get deterministic
 * placeholders. The real `.env` is deliberately never loaded here — tests must
 * not be able to reach Atlas, SendGrid, or Cloudinary.
 */
process.env.NODE_ENV = "test";

const defaults: Record<string, string> = {
  // The suite drives hundreds of requests from one address; without this the
  // limiters would throttle the tests themselves. The rate-limit tests turn it
  // off for the cases that need real enforcement.
  DISABLE_RATE_LIMITS: "true",
  ENABLE_MOCK_PAYMENTS: "true",
  // Off by default, matching production. The email tests flip it per case.
  ENABLE_EMAIL: "false",
  SESSION_SECRET: "test-session-secret",
  SENDGRID_API_KEY: "SG.test-key-not-real",
  FROM_EMAIL: "no-reply@ticketnest.test",
  FRONTEND_URL: "http://localhost:5173",
  EMAIL_VERIFY_TOKEN_SECRET: "test-email-verify-secret",
  PASSWORD_RESET_TOKEN_SECRET: "test-password-reset-secret",
  CLOUD_NAME: "test-cloud",
  CLOUD_API_KEY: "test-key",
  CLOUD_API_SECRET: "test-secret",
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] = value;
}

// Guard against a stray `.env` pointing tests at a real cluster.
delete process.env.MONGO_URI;
delete process.env.MONGODB_URI;
