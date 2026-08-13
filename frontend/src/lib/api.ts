/**
 * The single way this app talks to its backend.
 *
 * Before this existed, `API_BASE` was re-derived in 26 files (three different
 * ways, each with its own eslint-disable) and every one of ~57 `fetch` calls
 * hand-rolled `credentials: "include"`, JSON encoding, and error extraction.
 *
 * Everything that is the same on every request lives here: the base URL,
 * cookie credentials, JSON handling, CSRF tokens, and turning a non-2xx
 * response into a typed error with a message worth showing a user.
 */

export const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || "";

/** A non-2xx response. `status` and `code` let callers branch without parsing text. */
export class ApiError extends Error {
  readonly status: number;
  /** Stable identifier from the server, e.g. "HOLD_EXPIRED". */
  readonly code?: string;

  // Fields are assigned explicitly rather than declared as constructor
  // parameter properties: this project builds with `erasableSyntaxOnly`.
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const isApiError = (err: unknown): err is ApiError =>
  err instanceof ApiError;

/** True for an aborted request — callers usually want to ignore these. */
export const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === "AbortError";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_HEADER = "x-csrf-token";

// --- CSRF -------------------------------------------------------------------
// The server pairs a token with a cookie and checks both on every write. The
// token is fetched once and cached; a 403 invalidates it and the request is
// retried once, which covers the session being regenerated at login.

let csrfToken: string | null = null;
let csrfInFlight: Promise<string | null> | null = null;

const fetchCsrfToken = async (): Promise<string | null> => {
  try {
    const res = await fetch(`${API_BASE}/api/csrf-token`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body?.csrfToken === "string" ? body.csrfToken : null;
  } catch {
    // An older backend has no token endpoint. Writes still succeed there, so
    // failing soft beats blocking every mutation.
    return null;
  }
};

const getCsrfToken = async (forceRefresh = false): Promise<string | null> => {
  if (forceRefresh) {
    csrfToken = null;
    csrfInFlight = null;
  }
  if (csrfToken) return csrfToken;

  // Collapse concurrent misses into a single request.
  if (!csrfInFlight) {
    csrfInFlight = fetchCsrfToken().then((token) => {
      csrfToken = token;
      csrfInFlight = null;
      return token;
    });
  }
  return csrfInFlight;
};

/** Clears the cached token. Call whenever the session identity changes. */
export const resetCsrfToken = (): void => {
  csrfToken = null;
  csrfInFlight = null;
};

// --- Transport --------------------------------------------------------------

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Serialized as JSON. Pass a `FormData` to `body` instead for uploads. */
  json?: unknown;
  /** Sent as-is; used for file uploads, where the browser sets the boundary. */
  body?: FormData;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

const parseBody = async (res: Response): Promise<unknown> => {
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined;
  }

  const text = await res.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text);
  } catch {
    // Not every error response is JSON — a proxy 502 is usually HTML.
    return text;
  }
};

const toApiError = (status: number, body: unknown): ApiError => {
  if (body && typeof body === "object") {
    const shaped = body as { message?: string; error?: string; code?: string };
    return new ApiError(
      status,
      shaped.message || shaped.error || `Request failed (${status})`,
      shaped.code,
    );
  }
  if (typeof body === "string" && body.trim()) {
    return new ApiError(status, body);
  }
  return new ApiError(status, `Request failed (${status})`);
};

/**
 * Makes a request and returns the parsed body.
 *
 * Throws `ApiError` on any non-2xx response, so callers can use plain
 * try/catch instead of checking `res.ok` themselves.
 */
export async function api<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const isWrite = !SAFE_METHODS.has(method);

  const send = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = { ...options.headers };

    // FormData must set its own Content-Type, boundary included.
    if (options.json !== undefined)
      headers["Content-Type"] = "application/json";
    if (token) headers[CSRF_HEADER] = token;

    return fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      signal: options.signal,
      headers,
      body:
        options.json !== undefined
          ? JSON.stringify(options.json)
          : options.body,
    });
  };

  let res = await send(isWrite ? await getCsrfToken() : null);
  let body = await parseBody(res);

  // Refresh only for a real CSRF rejection. Retrying every 403 would submit
  // forbidden role/demo mutations twice.
  const isCsrfFailure =
    res.status === 403 &&
    body !== null &&
    typeof body === "object" &&
    (body as { code?: unknown }).code === "CSRF_INVALID";

  if (isWrite && isCsrfFailure) {
    const refreshed = await getCsrfToken(true);
    if (refreshed) {
      res = await send(refreshed);
      body = await parseBody(res);
    }
  }

  if (!res.ok) throw toApiError(res.status, body);

  return body as T;
}

/** Convenience wrappers — the shape most call sites want. */
export const apiGet = <T = unknown>(path: string, signal?: AbortSignal) =>
  api<T>(path, { signal });

export const apiPost = <T = unknown>(
  path: string,
  json?: unknown,
  signal?: AbortSignal,
) => api<T>(path, { method: "POST", json, signal });

export const apiPut = <T = unknown>(
  path: string,
  json?: unknown,
  signal?: AbortSignal,
) => api<T>(path, { method: "PUT", json, signal });

export const apiDelete = <T = unknown>(path: string, signal?: AbortSignal) =>
  api<T>(path, { method: "DELETE", signal });

/** Uploads a `FormData` payload (images). */
export const apiUpload = <T = unknown>(
  path: string,
  formData: FormData,
  signal?: AbortSignal,
) => api<T>(path, { method: "POST", body: formData, signal });

/**
 * A page of results.
 *
 * Every list endpoint returns this envelope rather than a bare array, so a
 * client can render a pager without a second request.
 */
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

/** Fetches one page and returns just the rows, for callers that show all of them. */
export const apiGetAll = async <T>(
  path: string,
  signal?: AbortSignal,
  limit = 100,
): Promise<T[]> => {
  const sep = path.includes("?") ? "&" : "?";
  const page = await apiGet<Page<T>>(`${path}${sep}limit=${limit}`, signal);
  return page.data;
};

/** Message for a caught error, safe to show a user. */
export const errorMessage = (
  err: unknown,
  fallback = "Something went wrong",
) => (err instanceof Error && err.message ? err.message : fallback);
