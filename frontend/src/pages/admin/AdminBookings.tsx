import React from "react";

import { useAdminBookings, type BookingStatus } from "./hooks/useAdminBookings";
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";

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
  // Base text-[9px], px-1.5
  return (
    <span
      className={`text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full border whitespace-nowrap ${map[status]}`}
    >
      {status}
    </span>
  );
}
// --- End Helper Components ---

const AdminBookings: React.FC = () => {
  const { bookings, status, setStatus, loading, error, refetch } =
    useAdminBookings("all");

  if (loading) return <Loading />;

  return (
    // Base padding px-2 py-4
    <div className="relative px-2 py-4 sm:px-6 lg:px-10 overflow-x-hidden">
      <div className="hidden md:block">
        <BlurCircle top="0" right="-100px" />
      </div>

      <div className="mx-auto max-w-[100rem]">
        {/* Header + Controls with wrap support */}
        {/* Stacks vertically on mobile, horizontal on lg+ */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h1 className="text-base xs:text-lg sm:text-xl font-semibold w-full lg:w-auto">
            Bookings
          </h1>

          {/* Filters stack vertically on mobile, horizontal on sm+ */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            <select
              className="rounded-md bg-black/30 border border-white/15 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm w-full sm:w-auto" // Full width on mobile
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
              className="px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md border border-white/15 hover:bg-white/10 transition w-full sm:w-auto" // Full width on mobile
            >
              Refresh
            </button>
          </div>
        </div>

        {error && <p className="mt-4 text-red-400">{error}</p>}

        {bookings.length === 0 ? (
          <p className="mt-8 text-gray-400 text-sm sm:text-base">
            No bookings found.
          </p>
        ) : (
          <>
            {/* lg+ TABLE */}
            <div className="hidden lg:block mt-4 sm:mt-6 overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm border border-white/10 rounded-lg overflow-hidden">
                <thead className="bg-white/5">
                  <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:sm:px-4 [&>th]:py-2">
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
                    const when = fmtRange(
                      b.eventId?.startTime,
                      b.eventId?.endTime
                    );
                    const userLabel =
                      b.userId?.username || b.userId?.email || b.userId?._id;

                    return (
                      <tr
                        key={b._id}
                        className="[&>td]:px-3 [&>td]:sm:px-4 [&>td]:py-2 align-top"
                      >
                        <td className="whitespace-nowrap text-xs">{created}</td>
                        <td className="max-w-[200px] xl:max-w-[240px]">
                          <span className="block truncate text-xs sm:text-sm">
                            {userLabel}
                          </span>
                        </td>
                        <td className="max-w-[280px] xl:max-w-[360px]">
                          <div className="font-medium truncate text-xs sm:text-sm">
                            {b.eventId?.title || "—"}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-400 truncate">
                            {b.eventId?.venueName}
                            {b.eventId?.venueAddress
                              ? ` • ${b.eventId.venueAddress}`
                              : ""}
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-xs">{when}</td>
                        <td className="max-w-[150px]">
                          <div className="text-xs sm:text-sm">
                            {seatCount} tickets
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-400 break-words">
                            {seats}
                          </div>
                        </td>
                        <td className="whitespace-nowrap text-xs sm:text-sm">
                          {b.total.toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap">
                          <Badge status={b.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* < lg (phones + tablets): Stacked Cards */}
            <div className="lg:hidden mt-4 sm:mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  <div
                    key={b._id}
                    className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-3" // Base padding p-3
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-[11px] text-gray-400">
                          {created}
                        </p>
                        <p className="mt-1 font-medium text-sm sm:text-base line-clamp-2">
                          {b.eventId?.title || "—"}
                        </p>
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {b.eventId?.venueName}
                          {b.eventId?.venueAddress
                            ? ` • ${b.eventId.venueAddress}`
                            : ""}
                        </p>
                      </div>
                      <Badge status={b.status} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-md bg-black/20 px-2 py-1">
                        <p className="text-[10px] sm:text-[11px] text-gray-400">
                          User
                        </p>
                        <p className="truncate text-xs sm:text-sm">
                          {userLabel}
                        </p>
                      </div>
                      <div className="rounded-md bg-black/20 px-2 py-1 text-right">
                        <p className="text-[10px] sm:text-[11px] text-gray-400">
                          Total
                        </p>
                        <p className="font-semibold text-xs sm:text-sm">
                          {b.total.toFixed(2)}
                        </p>
                      </div>
                      <div className="rounded-md bg-black/20 px-2 py-1 col-span-2">
                        <p className="text-[10px] sm:text-[11px] text-gray-400">
                          When
                        </p>
                        <p className="text-xs sm:text-sm">{when || "—"}</p>
                      </div>
                      <div className="rounded-md bg-black/20 px-2 py-1 col-span-2">
                        <p className="text-[10px] sm:text-[11px] text-gray-400">
                          Seats
                        </p>
                        <p className="text-xs sm:text-sm">
                          {seatCount} tickets
                          {seats ? (
                            <span className="text-[10px] sm:text-xs text-gray-400">
                              {" "}
                              — {seats}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminBookings;
