/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";
import { Users, UserCheck, CalendarDays, Tickets, Wallet } from "lucide-react";
import { useAdminStats } from "./hooks/useAdminStats";

function StatCard({
  title,
  value,
  icon,
  hint,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/5 backdrop-blur p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs sm:text-sm text-gray-300">{title}</p>
        <span className="opacity-80">
          {/* icon scales down on tiny screens */}
          <span className="sm:hidden inline-flex">
            {React.cloneElement(icon as any, {
              className: "w-4 h-4",
            })}
          </span>
          <span className="hidden sm:inline-flex">{icon}</span>
        </span>
      </div>
      <p className="mt-2 sm:mt-3 text-lg sm:text-2xl font-semibold break-words">
        {value}
      </p>
      {hint ? (
        <p className="text-[11px] sm:text-xs text-gray-400 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

const AdminDashboard: React.FC = () => {
  const { data, loading, error } = useAdminStats();

  if (loading) return <Loading />;
  if (error || !data) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-red-400 px-4 text-center">
        {error || "Failed to load"}
      </div>
    );
  }

  const { users, events, bookings, seats, topEvents } = data;

  return (
    <div className="relative">
      {/* soften blur visuals on very small screens */}
      <div className="pointer-events-none">
        <div className="hidden xs:block">
          <BlurCircle top="-80px" right="-100px" />
          <BlurCircle bottom="-80px" left="-80px" />
        </div>
      </div>

      {/* Responsive container */}
      <div className="mx-auto max-w-[100rem] px-3 sm:px-6 lg:px-10">
        <h1 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
          Admin Dashboard
        </h1>

        {/* KPI Rows — wrap nicely at all widths */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4">
          <StatCard
            title="Users"
            value={users.total}
            icon={<Users className="w-5 h-5" />}
            hint={`Attendees ${users.attendees} · Organizers ${users.organizers}`}
          />
          <StatCard
            title="Organizers"
            value={`${users.approvedOrganizers} approved`}
            icon={<UserCheck className="w-5 h-5" />}
            hint={`${users.pendingOrganizers} pending approval`}
          />
          <StatCard
            title="Events"
            value={events.total}
            icon={<CalendarDays className="w-5 h-5" />}
            hint={`Published ${events.published} · Draft ${events.draft} · Archived ${events.archived}`}
          />
          <StatCard
            title="Revenue"
            value={bookings.revenue.toFixed(2)}
            icon={<Wallet className="w-5 h-5" />}
            hint={`Paid bookings ${bookings.paid}`}
          />
          <StatCard
            title="Bookings"
            value={bookings.total}
            icon={<Tickets className="w-5 h-5" />}
            hint={`Unpaid ${bookings.unpaid} · Expired ${bookings.expired} · Failed ${bookings.failed}`}
          />
          <StatCard
            title="Seats"
            value={`${seats.sold}/${seats.total} sold`}
            icon={<Tickets className="w-5 h-5" />}
            hint={`Avail ${seats.available} · Reserved ${seats.reserved}`}
          />
        </div>

        {/* Top events: responsive table/cards */}
        <div className="mt-6 sm:mt-10 rounded-xl border border-white/10 bg-white/5 backdrop-blur">
          <div className="p-3 sm:p-4 border-b border-white/10">
            <h2 className="font-medium text-sm sm:text-base">
              Top Events by Revenue
            </h2>
          </div>

          {/* md+ TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-left text-gray-300">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Start</th>
                  <th className="py-3 px-4 text-right">Tickets</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topEvents.length === 0 && (
                  <tr>
                    <td className="py-5 px-4 text-gray-400" colSpan={5}>
                      No paid bookings yet.
                    </td>
                  </tr>
                )}
                {topEvents.map((t) => (
                  <tr key={t.eventId} className="border-t border-white/5">
                    <td className="py-3 px-4 max-w-[420px]">
                      <span className="line-clamp-1">{t.title}</span>
                    </td>
                    <td className="py-3 px-4 capitalize">{t.status}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {t.startTime
                        ? new Date(t.startTime).toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-3 px-4 text-right">{t.tickets}</td>
                    <td className="py-3 px-4 text-right">
                      {t.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* < md STACKED CARDS */}
          <div className="md:hidden p-2 sm:p-3 space-y-2">
            {topEvents.length === 0 ? (
              <div className="py-5 px-3 text-gray-400">
                No paid bookings yet.
              </div>
            ) : (
              topEvents.map((t) => (
                <div
                  key={t.eventId}
                  className="rounded-lg border border-white/10 bg-black/20 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm break-words">
                        {t.title}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">
                        {t.status}
                      </p>
                    </div>
                    <p className="text-sm whitespace-nowrap">
                      {t.startTime
                        ? new Date(t.startTime).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-white/5 px-2 py-1">
                      <span className="text-gray-400 text-xs">Tickets</span>
                      <div className="font-semibold">{t.tickets}</div>
                    </div>
                    <div className="rounded-md bg-white/5 px-2 py-1 text-right">
                      <span className="text-gray-400 text-xs">Revenue</span>
                      <div className="font-semibold">
                        {t.revenue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="h-6 sm:h-10" />
      </div>
    </div>
  );
};

export default AdminDashboard;
