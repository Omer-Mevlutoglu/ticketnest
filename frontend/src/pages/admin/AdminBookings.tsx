import React from "react";
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";
import { useAdminBookings, type BookingStatus } from "./hooks/useAdminBookings";

const STATUS_OPTIONS: (BookingStatus | "all")[] = [
  "all",
  "unpaid",
  "paid",
  "expired",
  "failed",
];

function fmtRange(start?: string, end?: string) {
  if (!start || !end) return "";
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const t = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const d = (d: Date) =>
    d.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  return sameDay
    ? `${d(s)} • ${t(s)}–${t(e)}`
    : `${d(s)} ${t(s)} → ${d(e)} ${t(e)}`;
}

function Badge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, string> = {
    paid: "border-emerald-400 text-emerald-300",
    unpaid: "border-yellow-400 text-yellow-300",
    expired: "border-gray-400 text-red-600",
    failed: "border-rose-400 text-rose-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${map[status]}`}>
      {status}
    </span>
  );
}

const AdminBookings: React.FC = () => {
  const { bookings, status, setStatus, loading, error, refetch } =
    useAdminBookings("all");

  if (loading) return <Loading />;

  return (
    <div className="relative px-6 md:px-10 lg:px-16 pt-8 pb-16">
      <BlurCircle top="0" right="-100px" />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Bookings</h1>

        <div className="flex items-center gap-2">
          <select
            className="rounded-md bg-black/30 border border-white/15 px-3 py-2 text-sm"
            value={status}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(e) => setStatus(e.target.value as any)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === "all" ? "All statuses" : opt}
              </option>
            ))}
          </select>

          <button
            onClick={refetch}
            className="px-3 py-2 text-sm rounded-md border border-white/15 hover:bg-white/10 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {bookings.length === 0 ? (
        <p className="mt-8 text-gray-400">No bookings found.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm border border-white/10 rounded-lg overflow-hidden">
            <thead className="bg-white/5">
              <tr className="[&>th]:text-left [&>th]:px-4 [&>th]:py-2">
                <th>Created</th>
                <th>User</th>
                <th>Event</th>
                <th>When</th>
                <th>Seats</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-white/10">
              {bookings.map((b) => {
                const seatCount = b.items?.length || 0;
                const seats = b.items
                  ?.map((i) => `(${i.seatCoords.x},${i.seatCoords.y})`)
                  .join(", ");
                const created = b.createdAt
                  ? new Date(b.createdAt).toLocaleString()
                  : "";
                const when = fmtRange(b.eventId?.startTime, b.eventId?.endTime);
                const userLabel =
                  b.userId?.username || b.userId?.email || b.userId?._id;

                return (
                  <tr key={b._id} className="[&>td]:px-4 [&>td]:py-2 align-top">
                    <td className="whitespace-nowrap">{created}</td>
                    <td>{userLabel}</td>
                    <td className="max-w-[260px]">
                      <div className="font-medium">
                        {b.eventId?.title || "—"}
                      </div>
                      <div className="text-xs text-gray-400">
                        {b.eventId?.venueName}
                        {b.eventId?.venueAddress
                          ? ` • ${b.eventId.venueAddress}`
                          : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{when}</td>
                    <td>
                      <div>{seatCount} tickets</div>
                      <div className="text-xs text-gray-400 break-words">
                        {seats}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{b.total.toFixed(2)}</td>
                    <td className="whitespace-nowrap">
                      <Badge status={b.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
