import React from "react";
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";
import { CalendarIcon, EyeIcon, PlusIcon, TicketIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useOrganizerDashboard } from "./hooks/useOrganizerDashboard";

const PLACEHOLDER = "/placeholder.jpg";

const formatDateTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  sub?: string;
}> = ({ label, value, icon, sub }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      {icon}
    </div>
    <p className="mt-2 text-2xl font-semibold">{value}</p>
    {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
  </div>
);

const EventRow: React.FC<{
  _id: string;
  title: string;
  startTime: string;
  status: string;
  venueName?: string;
  poster?: string;
}> = ({ _id, title, startTime, status, venueName, poster }) => {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={poster || PLACEHOLDER}
          alt={title}
          className="w-14 h-10 rounded object-cover"
        />
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          <p className="text-xs text-gray-400">
            {venueName ? `${venueName} • ` : ""}
            {formatDateTime(startTime)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full border ${
            status === "published"
              ? "border-emerald-400 text-emerald-300"
              : status === "draft"
              ? "border-yellow-400 text-yellow-300"
              : "border-gray-400 text-gray-300"
          }`}
        >
          {status}
        </span>
        <Link
          to={`/organizer/events/${_id}`}
          className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-white/10 rounded-md hover:bg-white/10"
        >
          <EyeIcon className="w-4 h-4" />
          Manage
        </Link>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const nav = useNavigate();
  const { events, stats, nextEvent, loading, error, refetch } =
    useOrganizerDashboard();

  if (loading) return <Loading />;

  return (
    <div className="relative p-6 md:p-8">
      {/* Background flourishes */}
      <BlurCircle top="-60px" left="-80px" />
      <BlurCircle bottom="-40px" right="-60px" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-400">
            Your events and performance at a glance.
          </p>
        </div>
        <button
          onClick={() => nav("/organizer/events/new")}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary hover:bg-primary-dull transition"
        >
          <PlusIcon className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Error inline */}
      {error && (
        <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3">
          <p className="text-rose-300 text-sm">{error}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-xs px-3 py-1 rounded border border-white/10 hover:bg-white/10"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Events"
          value={stats?.eventCount ?? 0}
          icon={<CalendarIcon className="w-4 h-4 opacity-70" />}
        />
        <StatCard
          label="Published"
          value={stats?.publishedCount ?? 0}
          sub={`${stats?.upcomingCount ?? 0} upcoming`}
        />
        <StatCard label="Drafts" value={stats?.draftCount ?? 0} />
        <StatCard label="Archived" value={stats?.archivedCount ?? 0} />
      </div>

      {/* Sales row */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          label="Total Revenue"
          value={`$ ${(stats?.totalRevenue ?? 0).toFixed(2)}`}
          icon={<TicketIcon className="w-4 h-4 opacity-70" />}
        />
        <StatCard label="Tickets Sold" value={stats?.ticketsSold ?? 0} />
      </div>

      {/* Next Event */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Next Event</h2>
          {nextEvent && (
            <Link
              to={`/organizer/events/${nextEvent._id}`}
              className="text-sm px-3 py-1 rounded border border-white/10 hover:bg-white/10"
            >
              Manage
            </Link>
          )}
        </div>

        {!nextEvent ? (
          <p className="text-sm text-gray-400 mt-2">
            No upcoming events yet. Create one to get started.
          </p>
        ) : (
          <div className="mt-3 flex items-center gap-3">
            <img
              src={nextEvent.poster || PLACEHOLDER}
              alt={nextEvent.title}
              className="w-24 h-16 rounded object-cover"
            />
            <div>
              <p className="font-medium">{nextEvent.title}</p>
              <p className="text-xs text-gray-400">
                {nextEvent.venueName ? `${nextEvent.venueName} • ` : ""}
                {formatDateTime(nextEvent.startTime)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent Events</h2>
          <Link
            to="/organizer/myevents"
            className="text-sm px-3 py-1 rounded border border-white/10 hover:bg-white/10"
          >
            View all
          </Link>
        </div>

        <div className="mt-2">
          {events.length === 0 ? (
            <p className="text-sm text-gray-400">
              You don’t have any events yet.
            </p>
          ) : (
            events
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.createdAt || b.startTime).getTime() -
                  new Date(a.createdAt || a.startTime).getTime()
              )
              .slice(0, 6)
              .map((e) => (
                <EventRow
                  key={e._id}
                  _id={e._id}
                  title={e.title}
                  startTime={e.startTime}
                  status={e.status}
                  venueName={e.venueName}
                  poster={e.poster}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
