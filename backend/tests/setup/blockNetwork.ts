import http from "node:http";
import https from "node:https";

const allowedHosts = new Set(["localhost", "127.0.0.1", "::1"]);

const hostnameFrom = (input: unknown): string | undefined => {
  if (input instanceof URL) return input.hostname;
  if (typeof input === "string") {
    try {
      return new URL(input).hostname;
    } catch {
      return undefined;
    }
  }
  if (!input || typeof input !== "object") return undefined;
  const options = input as { hostname?: string; host?: string };
  const raw = options.hostname ?? options.host;
  if (!raw) return undefined;
  if (raw.startsWith("[")) return raw.slice(1, raw.indexOf("]"));
  return raw.split(":")[0];
};

const assertLocal = (input: unknown) => {
  const hostname = hostnameFrom(input);
  if (hostname && !allowedHosts.has(hostname)) {
    throw new Error(`Unexpected outbound network request to ${hostname}`);
  }
};

const originalHttpRequest = http.request.bind(http);
const originalHttpsRequest = https.request.bind(https);

http.request = ((...args: Parameters<typeof http.request>) => {
  assertLocal(args[0]);
  return originalHttpRequest(...args);
}) as typeof http.request;
https.request = ((...args: Parameters<typeof https.request>) => {
  assertLocal(args[0]);
  return originalHttpsRequest(...args);
}) as typeof https.request;

http.get = ((...args: Parameters<typeof http.get>) => {
  assertLocal(args[0]);
  return http.request(...args).end();
}) as typeof http.get;
https.get = ((...args: Parameters<typeof https.get>) => {
  assertLocal(args[0]);
  return https.request(...args).end();
}) as typeof https.get;

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
  const input = args[0];
  const target = input instanceof Request ? input.url : input;
  assertLocal(target);
  return originalFetch(...args);
}) as typeof fetch;
