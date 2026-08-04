const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const HEADER = "x-csrf-token";

/**
 * Attaches the CSRF token to state-changing API calls.
 *
 * This is a `window.fetch` interceptor rather than a change to each call site
 * because the app currently makes ~55 raw `fetch` calls with no shared
 * transport. WP4.1 introduces `src/lib/api.ts`; when every caller goes through
 * it, move this logic there and delete the patch.
 *
 * The token is fetched once and cached. A 403 from the server invalidates the
 * cache and the request is retried once — which covers the case where the
 * session was regenerated at login and the old token no longer matches it.
 */

let cached: string | null = null;
let inFlight: Promise<string | null> | null = null;

const fetchToken = async (
  originalFetch: typeof window.fetch
): Promise<string | null> => {
  try {
    const res = await originalFetch(`${API_BASE}/api/csrf-token`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const body = await res.json();
    return typeof body?.csrfToken === "string" ? body.csrfToken : null;
  } catch {
    // An older backend has no token endpoint. Requests still succeed there,
    // so failing softly is better than blocking every mutation.
    return null;
  }
};

const getToken = async (
  originalFetch: typeof window.fetch,
  forceRefresh = false
): Promise<string | null> => {
  if (forceRefresh) {
    cached = null;
    inFlight = null;
  }
  if (cached) return cached;

  // Collapse concurrent misses into one request.
  if (!inFlight) {
    inFlight = fetchToken(originalFetch).then((token) => {
      cached = token;
      inFlight = null;
      return token;
    });
  }
  return inFlight;
};

/** Clears the cached token. Call after login or logout rotates the session. */
export const resetCsrfToken = (): void => {
  cached = null;
  inFlight = null;
};

const resolveUrl = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

export const installCsrfInterceptor = (): void => {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveUrl(input);
    const method = (
      init?.method ??
      (input instanceof Request ? input.method : "GET")
    ).toUpperCase();

    // Only our own API, and only writes.
    if (!url.startsWith(API_BASE) || SAFE_METHODS.has(method)) {
      return originalFetch(input, init);
    }

    const send = async (token: string | null) => {
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined)
      );
      if (token) headers.set(HEADER, token);
      return originalFetch(input, { ...init, headers });
    };

    const response = await send(await getToken(originalFetch));

    if (response.status === 403) {
      const refreshed = await getToken(originalFetch, true);
      if (refreshed) return send(refreshed);
    }

    return response;
  };
};
