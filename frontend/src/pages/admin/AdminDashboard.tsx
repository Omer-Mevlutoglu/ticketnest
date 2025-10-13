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
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-300">{title}</p>
        <span className="opacity-80">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      {hint ? <p className="text-xs text-gray-400 mt-1">{hint}</p> : null}
    </div>
  );
}

const AdminDashboard: React.FC = () => {
  const { data, loading, error } = useAdminStats();

  if (loading) return <Loading />;
  if (error || !data) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-red-400">
        {error || "Failed to load"}
      </div>
    );
  }

  const { users, events, bookings, seats, topEvents } = data;

  return (
    <div className="relative">
      <BlurCircle top="-80px" right="-100px" />
      <BlurCircle bottom="-80px" left="-80px" />

      <h1 className="text-xl font-semibold mb-6">Admin Dashboard</h1>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-3">
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
      </div>

      <div className="grid gap-4 md:grid-cols-3 mt-4">
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

      {/* Top events table */}
      <div className="mt-10 rounded-xl border border-white/10 bg-white/5 backdrop-blur">
        <div className="p-4 border-b border-white/10">
          <h2 className="font-medium">Top Events by Revenue</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
                  <td className="py-3 px-4">{t.title}</td>
                  <td className="py-3 px-4 capitalize">{t.status}</td>
                  <td className="py-3 px-4">
                    {t.startTime ? new Date(t.startTime).toLocaleString() : "—"}
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
      </div>
    </div>
  );
};

export default AdminDashboard;
