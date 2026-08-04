/**
 * Typed application configuration, validated once at startup.
 *
 * The rule this enforces: a missing or malformed setting must crash the process
 * with the variable's name, not degrade quietly. The bug that motivated it —
 * `FRONTEND_URL` silently falling back to `http://localhost:5173`, so every
 * verification email sent to a real user linked to their own machine — is
 * exactly the class of failure a default hides.
 *
 * Development and test keep working defaults. Production has none: every value
 * must be supplied.
 */

export type NodeEnv = "development" | "test" | "production";

export interface AppConfig {
  nodeEnv: NodeEnv;
  isProduction: boolean;
  port: number;

  mongoUri: string;
  sessionSecret: string;

  /** Absolute origin of the browser app, used to build email links. */
  frontendUrl: string;
  /** Origins allowed to send credentialed cross-site requests. */
  corsOrigins: string[];

  fromEmail: string;
  sendgridApiKey: string;
  emailVerifyTokenSecret: string;
  passwordResetTokenSecret: string;

  adminEmails: string[];
  adminInitialPassword?: string;

  cloudinary: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
  };
}

const DEV_DEFAULTS = {
  frontendUrl: "http://localhost:5173",
  corsOrigins: [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],
  mongoUri: "mongodb://127.0.0.1:27017/ticketnest",
  sessionSecret: "dev-session-secret-not-for-production",
  fromEmail: "no-reply@ticketnest.local",
};

class ConfigError extends Error {
  constructor(problems: string[]) {
    super(
      `Invalid configuration:\n${problems.map((p) => `  - ${p}`).join("\n")}`
    );
    this.name = "ConfigError";
  }
}

const parseOrigins = (raw: string): string[] =>
  raw
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

const isLocalOrigin = (origin: string): boolean =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

/**
 * Builds the config from an environment, collecting every problem before
 * throwing so one restart surfaces all of them rather than one per attempt.
 */
export const loadConfig = (env: NodeJS.ProcessEnv = process.env): AppConfig => {
  const nodeEnv = (env.NODE_ENV ?? "development") as NodeEnv;
  const isProduction = nodeEnv === "production";
  const problems: string[] = [];

  /** Required in production; falls back to `devDefault` elsewhere. */
  const required = (name: string, devDefault: string): string => {
    const value = env[name]?.trim();
    if (value) return value;
    if (isProduction) {
      problems.push(`${name} is required in production`);
      return "";
    }
    return devDefault;
  };

  const mongoUri = required("MONGO_URI", env.MONGODB_URI ?? DEV_DEFAULTS.mongoUri);
  const sessionSecret = required("SESSION_SECRET", DEV_DEFAULTS.sessionSecret);
  const frontendUrl = required("FRONTEND_URL", DEV_DEFAULTS.frontendUrl);
  const fromEmail = required("FROM_EMAIL", DEV_DEFAULTS.fromEmail);
  const sendgridApiKey = required("SENDGRID_API_KEY", "");
  const emailVerifyTokenSecret = required(
    "EMAIL_VERIFY_TOKEN_SECRET",
    "dev-email-verify-secret"
  );
  const passwordResetTokenSecret = required(
    "PASSWORD_RESET_TOKEN_SECRET",
    "dev-password-reset-secret"
  );

  if (frontendUrl && !/^https?:\/\//.test(frontendUrl)) {
    problems.push(`FRONTEND_URL must be an absolute URL, got "${frontendUrl}"`);
  }
  if (isProduction && sessionSecret === DEV_DEFAULTS.sessionSecret) {
    problems.push("SESSION_SECRET must not be the development placeholder");
  }

  const rawOrigins = env.CORS_ORIGINS?.trim();
  let corsOrigins: string[];
  if (rawOrigins) {
    corsOrigins = parseOrigins(rawOrigins);
    if (corsOrigins.length === 0) {
      problems.push("CORS_ORIGINS was set but contained no usable origin");
    }
    // A localhost origin in a production allowlist lets any developer machine
    // drive a session against live data.
    const local = corsOrigins.filter(isLocalOrigin);
    if (isProduction && local.length > 0) {
      problems.push(
        `CORS_ORIGINS must not contain localhost origins in production: ${local.join(", ")}`
      );
    }
  } else if (isProduction) {
    problems.push("CORS_ORIGINS is required in production");
    corsOrigins = [];
  } else {
    corsOrigins = [...DEV_DEFAULTS.corsOrigins];
  }

  // The frontend's own origin is always allowed to talk to its API.
  if (frontendUrl && !corsOrigins.includes(frontendUrl.replace(/\/$/, ""))) {
    corsOrigins.push(frontendUrl.replace(/\/$/, ""));
  }

  let adminEmails: string[] = [];
  if (env.ADMIN_EMAILS?.trim()) {
    try {
      const parsed = JSON.parse(env.ADMIN_EMAILS);
      if (!Array.isArray(parsed) || parsed.some((e) => typeof e !== "string")) {
        problems.push("ADMIN_EMAILS must be a JSON array of strings");
      } else {
        adminEmails = parsed.map((e) => e.trim().toLowerCase()).filter(Boolean);
      }
    } catch {
      problems.push(
        `ADMIN_EMAILS must be valid JSON, e.g. ["admin@example.com"]`
      );
    }
  }

  const adminInitialPassword = env.ADMIN_INITIAL_PASSWORD?.trim() || undefined;
  if (adminEmails.length > 0 && !adminInitialPassword) {
    problems.push(
      "ADMIN_INITIAL_PASSWORD is required when ADMIN_EMAILS lists accounts to seed"
    );
  }
  if (adminInitialPassword && adminInitialPassword.length < 12) {
    problems.push("ADMIN_INITIAL_PASSWORD must be at least 12 characters");
  }

  const port = Number(env.PORT ?? 5000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    problems.push(`PORT must be a valid port number, got "${env.PORT}"`);
  }

  if (problems.length > 0) throw new ConfigError(problems);

  return {
    nodeEnv,
    isProduction,
    port,
    mongoUri,
    sessionSecret,
    frontendUrl: frontendUrl.replace(/\/$/, ""),
    corsOrigins,
    fromEmail,
    sendgridApiKey,
    emailVerifyTokenSecret,
    passwordResetTokenSecret,
    adminEmails,
    adminInitialPassword,
    cloudinary: {
      cloudName: env.CLOUD_NAME,
      apiKey: env.CLOUD_API_KEY,
      apiSecret: env.CLOUD_API_SECRET,
    },
  };
};

let cached: AppConfig | null = null;

/** The validated config, loaded on first use. */
export const getConfig = (): AppConfig => {
  if (!cached) cached = loadConfig();
  return cached;
};

/** Forces the next `getConfig()` to re-read the environment. Tests only. */
export const resetConfigCache = (): void => {
  cached = null;
};
