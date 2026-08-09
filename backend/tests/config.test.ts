import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/configs/env";

/** WP2.2 — configuration is validated once, at startup, and fails loudly. */

const prod = (overrides: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: "production",
  MONGO_URI: "mongodb://db.example/ticketnest",
  SESSION_SECRET: "a-real-production-secret-value",
  FRONTEND_URL: "https://ticketnest.example",
  CORS_ORIGINS: "https://ticketnest.example",
  SENDGRID_API_KEY: "SG.real",
  FROM_EMAIL: "no-reply@ticketnest.example",
  EMAIL_VERIFY_TOKEN_SECRET: "verify-secret",
  PASSWORD_RESET_TOKEN_SECRET: "reset-secret",
  ...overrides,
});

describe("WP2.2 — configuration", () => {
  describe("production", () => {
    it("accepts a complete environment", () => {
      const config = loadConfig(prod());

      expect(config.isProduction).toBe(true);
      expect(config.frontendUrl).toBe("https://ticketnest.example");
      expect(config.corsOrigins).toEqual(["https://ticketnest.example"]);
    });

    // Email credentials are deliberately absent from this list: they are only
    // required when ENABLE_EMAIL is on. See emailFlag.test.ts.
    it.each([
      "MONGO_URI",
      "SESSION_SECRET",
      "FRONTEND_URL",
      "CORS_ORIGINS",
      "EMAIL_VERIFY_TOKEN_SECRET",
      "PASSWORD_RESET_TOKEN_SECRET",
    ])("refuses to start without %s", (key) => {
      const env = prod();
      delete env[key];

      expect(() => loadConfig(env)).toThrowError(new RegExp(key));
    });

    it("reports every problem at once rather than one per restart", () => {
      const env = prod();
      delete env.MONGO_URI;
      delete env.FRONTEND_URL;
      delete env.CORS_ORIGINS;

      try {
        loadConfig(env);
        expect.unreachable("should have thrown");
      } catch (err) {
        const message = (err as Error).message;
        expect(message).toContain("MONGO_URI");
        expect(message).toContain("FRONTEND_URL");
        expect(message).toContain("CORS_ORIGINS");
      }
    });

    it("requires email credentials only once email is switched on", () => {
      const withoutEmailKeys = prod();
      delete withoutEmailKeys.SENDGRID_API_KEY;
      delete withoutEmailKeys.FROM_EMAIL;

      // Off: the deployment boots fine without them.
      expect(() => loadConfig(withoutEmailKeys)).not.toThrow();

      // On: they become required.
      expect(() =>
        loadConfig({ ...withoutEmailKeys, ENABLE_EMAIL: "true" })
      ).toThrowError(/SENDGRID_API_KEY/);
    });

    it("rejects a localhost origin in the production allowlist", () => {
      expect(() =>
        loadConfig(
          prod({
            CORS_ORIGINS: "https://ticketnest.example,http://localhost:5173",
          })
        )
      ).toThrowError(/localhost/);
    });

    it("rejects the development session secret", () => {
      expect(() =>
        loadConfig(
          prod({ SESSION_SECRET: "dev-session-secret-not-for-production" })
        )
      ).toThrowError(/SESSION_SECRET/);
    });

    it("rejects a FRONTEND_URL that is not absolute", () => {
      expect(() =>
        loadConfig(prod({ FRONTEND_URL: "ticketnest.example" }))
      ).toThrowError(/FRONTEND_URL/);
    });
  });

  describe("development", () => {
    it("works with an empty environment", () => {
      const config = loadConfig({ NODE_ENV: "development" });

      expect(config.frontendUrl).toBe("http://localhost:5173");
      expect(config.corsOrigins).toContain("http://localhost:5173");
      expect(config.isProduction).toBe(false);
    });
  });

  describe("CORS origins", () => {
    it("parses a comma-separated list and trims trailing slashes", () => {
      const config = loadConfig(
        prod({
          CORS_ORIGINS: " https://a.example/ , https://b.example ",
          FRONTEND_URL: "https://a.example",
        })
      );

      expect(config.corsOrigins).toEqual([
        "https://a.example",
        "https://b.example",
      ]);
    });

    it("always allows the frontend's own origin", () => {
      const config = loadConfig(
        prod({
          CORS_ORIGINS: "https://admin.example",
          FRONTEND_URL: "https://app.example",
        })
      );

      expect(config.corsOrigins).toContain("https://app.example");
    });
  });

  describe("admin seeding config", () => {
    it("requires a password when admins are listed", () => {
      expect(() =>
        loadConfig(prod({ ADMIN_EMAILS: '["a@example.com"]' }))
      ).toThrowError(/ADMIN_INITIAL_PASSWORD/);
    });

    it("rejects a short bootstrap password", () => {
      expect(() =>
        loadConfig(
          prod({
            ADMIN_EMAILS: '["a@example.com"]',
            ADMIN_INITIAL_PASSWORD: "short",
          })
        )
      ).toThrowError(/at least 12/);
    });

    it("rejects malformed ADMIN_EMAILS", () => {
      expect(() =>
        loadConfig(prod({ ADMIN_EMAILS: "a@example.com" }))
      ).toThrowError(/ADMIN_EMAILS/);
    });

    it("normalises addresses", () => {
      const config = loadConfig(
        prod({
          ADMIN_EMAILS: '[" Admin@Example.com "]',
          ADMIN_INITIAL_PASSWORD: "long-enough-password",
        })
      );

      expect(config.adminEmails).toEqual(["admin@example.com"]);
    });
  });
});
