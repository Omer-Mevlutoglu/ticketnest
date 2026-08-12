import { useEffect, useState, type ReactNode } from "react";
import { API_BASE } from "@/lib/api";
import Loading from "./Loading";

const READY_STORAGE_KEY = "ticketnest.backend-ready";
const WARMUP_MESSAGE_DELAY_MS = 5_000;
const RETRY_DELAY_MS = 1_500;

const wasReadyThisSession = () => {
  try {
    return sessionStorage.getItem(READY_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

const rememberReady = () => {
  try {
    sessionStorage.setItem(READY_STORAGE_KEY, "true");
  } catch {
    // Storage can be unavailable in privacy-restricted browsers. The in-memory
    // ready state still prevents the notice from returning during this mount.
  }
};

interface BackendStartupGateProps {
  children: ReactNode;
}

/**
 * Holds the first application render until the API is ready.
 *
 * This is deliberately a one-time bootstrap probe, not a global slow-request
 * detector. Once readiness succeeds, the result is remembered for this browser
 * session and later endpoints can never reopen the Render warm-up notice.
 */
const BackendStartupGate = ({ children }: BackendStartupGateProps) => {
  const [ready, setReady] = useState(wasReadyThisSession);
  const [showWarmupMessage, setShowWarmupMessage] = useState(false);

  useEffect(() => {
    if (ready) return;

    let cancelled = false;
    let retryTimer: number | undefined;
    const controller = new AbortController();
    const messageTimer = window.setTimeout(
      () => setShowWarmupMessage(true),
      WARMUP_MESSAGE_DELAY_MS
    );

    const probeReadiness = async () => {
      try {
        const response = await fetch(`${API_BASE}/readyz`, {
          cache: "no-store",
          credentials: "omit",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (response.ok && !cancelled) {
          rememberReady();
          window.clearTimeout(messageTimer);
          setReady(true);
          return;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }

      if (!cancelled) {
        retryTimer = window.setTimeout(probeReadiness, RETRY_DELAY_MS);
      }
    };

    void probeReadiness();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(messageTimer);
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    };
  }, [ready]);

  if (ready) return children;
  if (!showWarmupMessage) return <Loading />;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section
        className="w-full max-w-lg rounded-3xl border border-primary/30 bg-zinc-950/90 p-8 text-center shadow-2xl shadow-primary/10"
        role="status"
        aria-live="polite"
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-white/20 border-t-accent"
        />
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
          Starting the demo
        </p>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Warming up the TicketNest server…
        </h1>
        <p className="mt-4 text-sm leading-6 text-gray-300 sm:text-base">
          The portfolio API runs on Render and may need about 10–20 seconds to
          wake after being idle. This screen closes automatically when it is
          ready.
        </p>
      </section>
    </main>
  );
};

export default BackendStartupGate;
