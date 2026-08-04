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
 * Validates every flag at boot so a typo fails fast instead of silently
 * changing behaviour. Call once during bootstrap.
 */
export const assertFeatureFlags = (): void => {
  const mockPayments = isMockPaymentsEnabled();

  if (mockPayments && process.env.NODE_ENV === "production") {
    console.warn(
      "⚠️  ENABLE_MOCK_PAYMENTS is on in production. Bookings can be marked " +
        "paid without a payment provider. This is only acceptable for the " +
        "portfolio demo environment."
    );
  }
};
