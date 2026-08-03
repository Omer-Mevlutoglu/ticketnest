import { useEffect, useState } from "react";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

export type AppConfig = {
  /** Whether the server still exposes the simulated payment endpoints. */
  mockPaymentsEnabled: boolean;
};

/**
 * Public runtime configuration from the server.
 *
 * Lets the UI avoid offering actions the server would reject — currently the
 * simulated checkout, which returns 404 once real payments replace it.
 */
export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/config`, {
          credentials: "include",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error("Failed to load configuration");
        setConfig((await res.json()) as AppConfig);
      } catch {
        // An older backend has no /api/config. Assume the simulated flow is
        // available so checkout keeps working rather than locking users out.
        if (!ac.signal.aborted) setConfig({ mockPaymentsEnabled: true });
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  return { config, loading };
}
