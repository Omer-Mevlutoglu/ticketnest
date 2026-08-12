import { useEffect, useState } from "react";
import { apiGet, isAbortError } from "../lib/api";

export type AppConfig = {
  /** Whether the server still exposes the simulated payment endpoints. */
  mockPaymentsEnabled: boolean;
  /**
   * Whether the server sends email. When false, signup verifies immediately
   * and password reset is unavailable.
   */
  emailEnabled: boolean;
  /** Whether this deployment is the protected public portfolio demo. */
  demoMode: boolean;
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
        setConfig(await apiGet<AppConfig>("/api/config", ac.signal));
      } catch (e) {
        if (isAbortError(e)) return;
        // An older backend has no /api/config. Assume the simulated flow is
        // available so checkout keeps working rather than locking users out.
        setConfig({
          mockPaymentsEnabled: true,
          emailEnabled: false,
          demoMode: false,
        });
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  return { config, loading };
}
