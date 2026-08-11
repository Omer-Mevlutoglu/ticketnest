import { ShieldCheckIcon } from "lucide-react";
import { useAppConfig } from "@/hooks/useAppConfig";

export function DemoModeBanner() {
  const { config } = useAppConfig();
  if (!config?.demoMode) return null;

  return (
    <aside className="border-b border-amber-300/30 bg-amber-400/10 px-4 py-2 text-center text-xs text-amber-100">
      <ShieldCheckIcon className="mr-1.5 inline h-4 w-4" />
      Public portfolio demo: browsing and attendee checkout are available, while
      organizer and demo-admin writes are protected. Data may be reset. Please
      do not enter private information. Logins: attendee@demo.ticketnest,
      organizer@demo.ticketnest, admin@demo.ticketnest. Password:
      DemoPassword123!
    </aside>
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
