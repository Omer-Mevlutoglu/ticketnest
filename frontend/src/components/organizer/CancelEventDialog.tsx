import { useEffect, useState } from "react";
import { AlertTriangleIcon, Loader2Icon, XIcon } from "lucide-react";

export type EventCancellationResult = {
  refundedBookings: number;
  releasedBookings: number;
  releasedSeats: number;
  alreadyCancelled: boolean;
  paymentMode: "simulated";
  realRefundsProcessed: false;
};

type CancelEventDialogProps = {
  open: boolean;
  eventTitle: string;
  busy: boolean;
  result: EventCancellationResult | null;
  onClose: () => void;
  onConfirm: () => void;
};

const CancelEventDialog = ({
  open,
  eventTitle,
  busy,
  result,
  onClose,
  onConfirm,
}: CancelEventDialogProps) => {
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (!open) return;
    setConfirmation("");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose, open]);

  if (!open) return null;

  const confirmed = confirmation === eventTitle;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-event-title"
        aria-describedby="cancel-event-description"
        className="w-full max-w-lg rounded-2xl border border-rose-400/30 bg-[#14121c] p-5 shadow-2xl shadow-black/50 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-500/15 text-rose-300">
              <AlertTriangleIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 id="cancel-event-title" className="text-lg font-semibold">
                {result ? "Event cancelled" : "Cancel this event?"}
              </h2>
              <p
                id="cancel-event-description"
                className="mt-1 text-sm text-gray-400"
              >
                {result
                  ? "The cancellation completed safely."
                  : "This is a permanent lifecycle action and cannot be undone."}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close cancellation dialog"
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {result ? (
          <div className="mt-5">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-xl font-semibold">{result.refundedBookings}</p>
                <p className="mt-1 text-xs text-gray-400">Demo bookings closed</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-xl font-semibold">{result.releasedBookings}</p>
                <p className="mt-1 text-xs text-gray-400">Holds expired</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-xl font-semibold">{result.releasedSeats}</p>
                <p className="mt-1 text-xs text-gray-400">Seats released</p>
              </div>
            </div>
            <p className="mt-4 rounded-lg border border-sky-400/20 bg-sky-500/10 p-3 text-xs text-sky-100/90">
              TicketNest uses simulated payments for this portfolio demo. No
              real charge was made and no real refund was processed.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium transition hover:bg-primary-dull"
            >
              Back to my events
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <ul className="space-y-2 rounded-lg border border-rose-400/20 bg-rose-500/5 p-4 text-sm text-gray-300">
              <li>• Paid demo bookings will be closed.</li>
              <li>• Active seat holds will expire.</li>
              <li>• Reserved and sold seats will be released.</li>
              <li>• Ticket holders are notified when email is enabled.</li>
            </ul>

            <label className="mt-4 block text-sm text-gray-300">
              Type <strong className="text-white">{eventTitle}</strong> to
              confirm
            </label>
            <input
              autoFocus
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={busy}
              className="mt-2 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none transition focus:border-rose-400/60 disabled:opacity-50"
              aria-label="Event title confirmation"
              autoComplete="off"
            />

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-md border border-white/10 px-4 py-2 text-sm transition hover:bg-white/10 disabled:opacity-50"
              >
                Keep event
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy || !confirmed}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy && <Loader2Icon className="h-4 w-4 animate-spin" />}
                {busy ? "Cancelling..." : "Cancel event permanently"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default CancelEventDialog;
