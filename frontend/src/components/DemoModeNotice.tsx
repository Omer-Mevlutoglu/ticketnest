import { useCallback, useEffect, useState } from "react";
import { KeyRoundIcon, ShieldCheckIcon, XIcon } from "lucide-react";
import { useAppConfig } from "@/hooks/useAppConfig";

const NOTICE_KEY = "ticketnest-demo-notice-seen";

const demoAccounts = [
  { role: "Attendee", email: "attendee@demo.ticketnest" },
  { role: "Organizer", email: "organizer@demo.ticketnest" },
  { role: "Admin", email: "admin@demo.ticketnest" },
] as const;

export function DemoAccessDialog() {
  const { config } = useAppConfig();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!config?.demoMode) return;

    try {
      if (sessionStorage.getItem(NOTICE_KEY) !== "true") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, [config?.demoMode]);

  const closeDialog = useCallback(() => {
    setOpen(false);
    try {
      sessionStorage.setItem(NOTICE_KEY, "true");
    } catch {
      // Storage can be unavailable in privacy modes; closing still works.
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeDialog, open]);

  if (!config?.demoMode) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-[#18130a]/95 px-3 py-2 text-xs font-medium text-amber-100 shadow-lg shadow-black/30 backdrop-blur transition hover:bg-amber-400/15"
        >
          <KeyRoundIcon className="h-3.5 w-3.5" />
          Demo access
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-access-title"
            className="relative w-full max-w-md rounded-2xl border border-amber-300/25 bg-[#111113] p-5 text-white shadow-2xl shadow-black/60"
          >
            <button
              type="button"
              onClick={closeDialog}
              aria-label="Close demo access information"
              className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
            >
              <XIcon className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-amber-200">
              <ShieldCheckIcon className="h-5 w-5" />
              <h2 id="demo-access-title" className="font-semibold">
                Welcome to the TicketNest demo
              </h2>
            </div>
            <p className="mt-2 pr-5 text-xs leading-5 text-gray-400">
              Attendee checkout is interactive. Organizer and public-admin
              management actions are read-only so the shared demo stays safe.
              Demo data may be reset—please do not enter private information.
            </p>

            <div className="mt-4 space-y-2">
              {demoAccounts.map((account) => (
                <div
                  key={account.role}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <span className="text-xs text-gray-400">{account.role}</span>
                  <code className="text-[11px] text-gray-100 sm:text-xs">
                    {account.email}
                  </code>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-300/20 bg-amber-400/10 px-3 py-2">
              <span className="text-xs text-amber-100/70">Password</span>
              <code className="text-xs font-semibold text-amber-100">
                DemoPassword123!
              </code>
            </div>

            <button
              type="button"
              onClick={closeDialog}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium transition hover:bg-primary-dull"
            >
              Explore the demo
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export function DemoWriteNotice() {
  return (
    <div className="mb-4 rounded-lg border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
      This screen is read-only in the hosted portfolio demo. Clone the project
      and run it with DEMO_MODE=false to test protected management operations.
    </div>
  );
}

export function DemoProtectedPage() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <DemoWriteNotice />
      <p className="text-sm text-gray-400">
        The server also enforces this policy with a stable DEMO_RESTRICTED
        response; disabling this UI cannot bypass it.
      </p>
    </div>
  );
}
