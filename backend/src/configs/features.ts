/**
 * Feature flags, read from the environment and validated on use.
 *
 * These are deliberately functions rather than module-level constants so that
 * the value is read per request. That keeps behaviour honest under tests and
 * avoids baking a boot-time decision into the route table.
 */

const TRUTHY = new Set(["true", "1", "yes", "on"]);
const FALSY = new Set(["false", "0", "no", "off"]);

const parseBooleanFlag = (name: string, raw: string): boolean => {
  const value = raw.trim().toLowerCase();
  if (TRUTHY.has(value)) return true;
  if (FALSY.has(value)) return false;
  throw new Error(
    `Invalid value for ${name}: "${raw}". Expected one of: true, false.`
  );
};

/**
 * Whether the simulated ("mock") payment endpoints are available.
 *
 * Production must opt in explicitly — a real deployment should not offer a way
 * to mark a booking paid without a payment provider unless that is a conscious
 * choice for the portfolio demo. Other environments default to enabled so local
 * development and tests work without extra configuration.
 */
export const isMockPaymentsEnabled = (): boolean => {
  const raw = process.env.ENABLE_MOCK_PAYMENTS;

  if (raw === undefined || raw.trim() === "") {
    return process.env.NODE_ENV !== "production";
  }

  return parseBooleanFlag("ENABLE_MOCK_PAYMENTS", raw);
};

/** Whether the CSRF token layer is active. See middleware/csrf.ts. */
export const isCsrfTokenCheckEnabled = (): boolean =>
  process.env.NODE_ENV === "production";

/**
 * Whether the app sends transactional email.
 *
 * **Defaults to off**, which is deliberate. Email is the one dependency that
 * cannot be faked locally: without a provider key, a fresh clone would create
 * an account, send nothing, and leave the user unable to sign in — because the
 * login strategy refuses unverified accounts. Off by default means the project
 * runs end to end with no external service and no configuration.
 *
 * When off:
 *   - registration marks the account verified immediately and sends nothing;
 *   - password reset is unavailable, and the UI hides it.
 *
 * Turn it on and supply `SENDGRID_API_KEY` and `FROM_EMAIL` to exercise the
 * real flow. The verification and reset logic is unchanged either way — only
 * whether a message is actually dispatched.
 */
export const isEmailEnabled = (): boolean => {
  const raw = process.env.ENABLE_EMAIL;

  if (raw === undefined || raw.trim() === "") return false;

  return parseBooleanFlag("ENABLE_EMAIL", raw);
};

/** Whether this deployment is the locked-down public portfolio demo. */
export const isDemoMode = (): boolean => {
  const raw = process.env.DEMO_MODE;
  if (raw === undefined || raw.trim() === "") return false;
  return parseBooleanFlag("DEMO_MODE", raw);
};

/**
 * Validates every flag at boot so a typo fails fast instead of silently
 * changing behaviour. Call once during bootstrap.
 */
export const assertFeatureFlags = (): void => {
  const mockPayments = isMockPaymentsEnabled();
  const demoMode = isDemoMode();

  if (mockPayments && process.env.NODE_ENV === "production") {
    console.warn(
      "⚠️  ENABLE_MOCK_PAYMENTS is on in production. Bookings can be marked " +
        "paid without a payment provider. This is only acceptable for the " +
        "portfolio demo environment."
    );
  }

  if (isEmailEnabled()) {
    // Required values are enforced in configs/env.ts; this is the reminder
    // that turning the flag on changes the signup path.
    console.log(
      "✉️  Email delivery is ON. New accounts must verify before signing in."
    );
  } else {
    console.log(
      "✉️  Email delivery is OFF. New accounts are auto-verified and password " +
        "reset is unavailable. Set ENABLE_EMAIL=true to send real email."
    );
  }


  if (demoMode) {
    console.warn(
      "🛡️  DEMO_MODE is ON. Organizer writes and untrusted admin writes are protected."
    );
  }
};
