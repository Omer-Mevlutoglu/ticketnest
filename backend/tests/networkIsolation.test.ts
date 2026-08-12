import https from "node:https";
import { describe, expect, it } from "vitest";

describe("test network isolation", () => {
  it("rejects unexpected fetch traffic", async () => {
    await expect(fetch("https://example.com")).rejects.toThrow(
      /Unexpected outbound network request/
    );
  });

  it("rejects unexpected provider-style HTTPS traffic", () => {
    expect(() => https.get("https://api.sendgrid.com/v3/mail/send")).toThrow(
      /Unexpected outbound network request/
    );
  });
});
