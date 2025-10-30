import React from "react";
import { CalendarIcon, EyeIcon, PlusIcon, TicketIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useOrganizerDashboard } from "./hooks/useOrganizerDashboard"; // Assuming hooks are in ./hooks/
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";

const PLACEHOLDER = "/placeholder.jpg";

// --- Helper Functions ---
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
  // Smallest base padding
  <div className="rounded-xl border border-white/10 bg-white/5 p-2 sm:p-3">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      {icon}
    </div>
    {/* Ensure value breaks */}
    <p className="mt-1 sm:mt-2 text-lg sm:text-xl md:text-2xl font-semibold break-words">
      {value}
    </p>
    {/* Ensure sub-text breaks */}
    {sub && <p className="mt-1 text-xs text-gray-400 break-words">{sub}</p>}
  </div>
);

const EventRow: React.FC<{
  _id: string;
  title: string;
  startTime: string;
  status: string;
  venueName?: string;
  poster?: string;
}> = ({ _id, title, startTime, status, venueName, poster }) => (
  // Smallest base gap (gap-1.5), ensure min-w-0 on parent
  <div className="flex items-center justify-between gap-1.5 sm:gap-2 border-b border-white/10 py-2 sm:py-3 min-w-0">
    {/* Left side: Image + Text */}
    {/* Smallest base gap (gap-1.5), allow shrinking */}
    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
      <img
        src={poster || PLACEHOLDER}
        alt={title}
        // Smallest base image size
        className="w-10 h-8 sm:w-12 sm:h-9 rounded object-cover flex-shrink-0"
      />
      {/* Ensure this text container can shrink and truncate */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-xs sm:text-sm">{title}</p>
        <p className="text-[10px] sm:text-xs text-gray-400 truncate">
          {venueName ? `${venueName} • ` : ""}
          {formatDateTime(startTime)}
        </p>
      </div>
    </div>
    {/* Right side: Status + Button */}
    {/* Smallest base gap (gap-1), ensure wrapping works */}
    <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 flex-shrink-0">
      <span
        // Smallest base text/padding
        className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full border whitespace-nowrap ${
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
        to={`/organizer/events/${_id}/manage`}
        // Smallest base text/padding
        className="inline-flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 sm:py-1 border border-white/10 rounded hover:bg-white/10 whitespace-nowrap"
      >
        <EyeIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
        {/* Hide text below sm breakpoint */}
        <span className="hidden sm:inline">Manage</span>
      </Link>
    </div>
  </div>
);
// --- End Helper Functions ---

const Dashboard: React.FC = () => {
  const nav = useNavigate();
  const { events, stats, nextEvent, loading, error, refetch } =
    useOrganizerDashboard();

  if (loading) return <Loading />;

  return (
    // Smallest base padding (px-2 py-4)
    <div className="relative px-2 py-4 sm:px-4 sm:py-6 md:px-8 overflow-x-hidden">
      <BlurCircle top="-60px" left="-80px" />
      <BlurCircle bottom="-40px" right="-60px" />

      {/* Ensure full width and prevent children from overflowing */}
      <div className="w-full max-w-full">
        {/* Header - Stacks vertically below sm breakpoint */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Text block */}
          <div className="min-w-0 flex-1 w-full sm:w-auto">
            {" "}
            {/* Ensure takes width below sm */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-semibold break-words">
              Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 break-words">
              Your events and performance at a glance.
            </p>
          </div>
          {/* Button */}
          <button
            onClick={() => nav("/organizer/events/new")}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:py-2 rounded-md bg-primary hover:bg-primary-dull transition text-xs sm:text-sm flex-shrink-0 w-full sm:w-auto" // Full width below sm
          >
            <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Create Event
          </button>
        </div>

        {/* Error inline (Unchanged) */}
        {error && (
          <div className="mb-4 rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 sm:p-3">
            <p className="text-rose-300 text-xs sm:text-sm break-words">
              {error}
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-xs px-3 py-1 rounded border border-white/10 hover:bg-white/10"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats row - Grid-cols-1 base, sm:grid-cols-2, lg:grid-cols-4 */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <StatCard
            label="Total Events"
            value={stats?.eventCount ?? 0}
            icon={
              <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />
            }
          />
          <StatCard
            label="Published"
            value={stats?.publishedCount ?? 0}
            sub={`${stats?.upcomingCount ?? 0} upcoming`}
          />
          <StatCard label="Drafts" value={stats?.draftCount ?? 0} />
          <StatCard label="Archived" value={stats?.archivedCount ?? 0} />
        </div>

        {/* Sales row - Grid-cols-1 base, sm:grid-cols-2 */}
        <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          <StatCard
            label="Total Revenue"
            value={`$ ${(stats?.totalRevenue ?? 0).toFixed(2)}`}
            icon={
              <TicketIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />
            }
          />
          <StatCard label="Tickets Sold" value={stats?.ticketsSold ?? 0} />
        </div>

        {/* Next Event */}
        <div className="mb-4 sm:mb-6 rounded-xl border border-white/10 bg-white/5 p-2 sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-sm sm:text-base md:text-lg">
              Next Event
            </h2>
            {nextEvent && (
              <Link
                to={`/organizer/events/${nextEvent._id}/manage`}
                className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded border border-white/10 hover:bg-white/10 flex-shrink-0"
              >
                Manage
              </Link>
            )}
          </div>

          {!nextEvent ? (
            <p className="text-xs sm:text-sm text-gray-400 mt-2">
              No upcoming events yet. Create one to get started.
            </p>
          ) : (
            <div className="mt-2 sm:mt-3 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
              <img
                src={nextEvent.poster || PLACEHOLDER}
                alt={nextEvent.title}
                // Slightly smaller base image size
                className="w-16 h-12 sm:w-20 sm:h-14 rounded object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-xs sm:text-sm md:text-base">
                  {nextEvent.title}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 truncate">
                  {nextEvent.venueName ? `${nextEvent.venueName} • ` : ""}
                  {formatDateTime(nextEvent.startTime)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-2 sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-sm sm:text-base md:text-lg">
              Recent Events
            </h2>
            <Link
              to="/organizer/myevents"
              className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded border border-white/10 hover:bg-white/10 flex-shrink-0"
            >
              View all
            </Link>
          </div>
          <div className="mt-2">
            {events.length === 0 ? (
              <p className="text-xs sm:text-sm text-gray-400">
                You don’t have any events yet.
              </p>
            ) : (
              <div className="flow-root">
                {events
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
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
