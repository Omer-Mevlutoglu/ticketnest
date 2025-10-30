import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarIcon,
  Edit3Icon,
  EyeIcon,
  MapPinIcon,
  PlusIcon,
} from "lucide-react";
import useMyEvents from "./hooks/useMyEvents"; // Assuming hooks are in ./hooks/
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";

const PLACEHOLDER = "/placeholder.jpg";

// --- Helper Functions ---
function formatRange(startISO?: string, endISO?: string) {
  if (!startISO || !endISO) return "";
  const s = new Date(startISO);
  const e = new Date(endISO);
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

const StatusPill: React.FC<{ status: "draft" | "published" | "archived" }> = ({
  status,
}) => {
  const cls =
    status === "published"
      ? "border-emerald-400 text-emerald-300"
      : status === "draft"
      ? "border-yellow-400 text-yellow-300"
      : "border-gray-400 text-gray-300";
  // Base text-[9px], px-1
  return (
    <span
      className={`text-[9px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-full border whitespace-nowrap ${cls}`}
    >
      {status}
    </span>
  );
};
// --- End Helper Functions ---

const MyEventsPage: React.FC = () => {
  const [status, setStatus] = useState<
    "all" | "draft" | "published" | "archived"
  >("all");
  const [search, setSearch] = useState("");
  const { events, loading, error, refetch, rawEvents } = useMyEvents({
    status,
    search,
  });
  const navigate = useNavigate();

  const counts = useMemo(() => {
    const c = { all: 0, draft: 0, published: 0, archived: 0 };
    for (const e of rawEvents) {
      c.all++;
      if (e.status === "draft") c.draft++;
      if (e.status === "published") c.published++;
      if (e.status === "archived") c.archived++;
    }
    return c;
  }, [rawEvents]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-center p-4">
        <div>
          <p className="text-red-400 mb-3">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 rounded bg-primary hover:bg-primary-dull transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    // Base padding px-2 py-4
    <div className="relative px-2 py-4 sm:px-6 md:px-10 lg:px-12 overflow-x-hidden">
      <BlurCircle top="-40px" right="-60px" />
      {/* Header stacks below sm */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-base sm:text-lg md:text-xl font-semibold w-full sm:w-auto">
          My Events
        </h1>{" "}
        {/* Base text-base */}
        <button
          onClick={() => navigate("/organizer/events/new")}
          // Base text-[10px], padding py-1
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded bg-primary hover:bg-primary-dull transition text-[10px] sm:text-xs w-full sm:w-auto" // Base text-[10px]
        >
          <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4" />{" "}
          {/* Base size w-3 h-3 */}
          Create Event
        </button>
      </div>

      {/* filters stack below sm, wrap buttons */}
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-1 sm:gap-1.5 flex-wrap">
          {" "}
          {/* Allow buttons to wrap, base gap-1 */}
          {(["all", "draft", "published", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              // Base text-[9px], padding py-0.5
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border text-[9px] sm:text-[10px] whitespace-nowrap ${
                // Base text-[9px]
                status === s
                  ? "border-primary text-primary bg-primary/10"
                  : "border-white/15 text-gray-300 hover:bg-white/5"
              }`}
            >
              {s[0].toUpperCase() + s.slice(1)} ({counts[s]})
            </button>
          ))}
        </div>

        <input
          placeholder="Search title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          // Base text-[10px], padding py-1
          className="w-full sm:w-64 rounded-md border border-white/10 bg-white/5 px-2 sm:px-3 py-1 sm:py-1.5 outline-none text-[10px] sm:text-xs" // Base text-[10px]
        />
      </div>

      {/* list */}
      <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
        {events.length === 0 && (
          <div className="text-xs sm:text-sm text-gray-400 border border-white/10 rounded-lg p-4 sm:p-6 text-center">
            No events match your filters.
          </div>
        )}

        {events.map((ev) => (
          // Base padding p-1.5, overflow-hidden added
          <div
            key={ev._id}
            // Stacks vertically below sm breakpoint
            className="flex flex-col sm:flex-row justify-between bg-white/5 border border-white/10 rounded-lg p-1.5 sm:p-2 gap-2 sm:gap-3 overflow-hidden" // Added overflow-hidden
          >
            {/* Main content flex */}
            <div className="flex gap-1.5 sm:gap-2 flex-1 min-w-0">
              {" "}
              {/* base gap-1.5 */}
              <img
                src={ev.poster || PLACEHOLDER}
                alt={ev.title}
                // Base image size w-16 h-12
                className="w-16 h-12 sm:w-24 sm:h-16 md:w-32 md:h-20 lg:w-40 lg:h-28 object-cover rounded flex-shrink-0" // Base w-16 h-12
              />
              {/* Text content - Crucial: flex-1 AND min-w-0 */}
              <div className="flex flex-col min-w-0 flex-1 py-0 sm:py-1">
                {" "}
                {/* base py-0 */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap">
                  {" "}
                  {/* Allow wrap */}
                  {/* Title must truncate */}
                  <h3 className="font-semibold text-[11px] sm:text-sm md:text-base truncate flex-1 mr-1">
                    {ev.title}
                  </h3>{" "}
                  {/* Base text-[11px], flex-1 mr-1 */}
                  <StatusPill status={ev.status} />
                </div>
                {/* Base text-[9px] */}
                <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 mt-0 sm:mt-0.5 truncate">
                  <CalendarIcon className="inline w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 mr-0.5 sm:mr-1" />{" "}
                  {/* Base size w-2.5 */}
                  {formatRange(ev.startTime, ev.endTime)}
                </p>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 mt-0 sm:mt-0.5 truncate">
                  <MapPinIcon className="inline w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 mr-0.5 sm:mr-1" />{" "}
                  {/* Base size w-2.5 */}
                  {ev.venueName}
                  {ev.venueAddress ? ` • ${ev.venueAddress}` : ""}
                </p>
                {/* Hide categories below md */}
                <div className="mt-auto text-[9px] sm:text-[10px] text-gray-400 hidden md:block truncate pt-1">
                  {" "}
                  {/* Hide below md */}
                  Categories: {ev.categories?.join(", ") || "—"}
                </div>
              </div>
            </div>

            {/* Buttons stack vertically below sm, reduce base size */}
            <div className="flex flex-row sm:flex-col items-stretch sm:items-end justify-start sm:justify-center gap-1 sm:gap-1.5 p-1 sm:p-0 border-t sm:border-t-0 sm:border-l border-white/10 flex-shrink-0">
              {" "}
              {/* Base gap-1, p-1 */}
              <Link
                to={`/organizer/events/${ev._id}/manage`}
                // Base text-[9px], padding py-0.5
                className="inline-flex items-center justify-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-white/15 hover:bg-white/10 transition text-[9px] sm:text-[10px] whitespace-nowrap" // Base text-[9px]
                title="Manage"
              >
                <Edit3Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{" "}
                {/* Base size w-2.5 */}
                <span className="hidden sm:inline">Manage</span>
                <span className="sm:hidden">Manage</span>{" "}
                {/* Show text below sm */}
              </Link>
              <Link
                to={`/events/${ev._id}`}
                // Base text-[9px], padding py-0.5
                className="inline-flex items-center justify-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-white/15 hover:bg-white/10 transition text-[9px] sm:text-[10px] whitespace-nowrap" // Base text-[9px]
                title="Public view"
                target="_blank"
                rel="noreferrer"
              >
                <EyeIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{" "}
                {/* Base size w-2.5 */}
                <span className="hidden sm:inline">View</span>
                <span className="sm:hidden">View</span>{" "}
                {/* Show text below sm */}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 sm:mt-6 text-xs text-gray-400">
        Showing: <b>{events.length}</b> events matching filters.
      </div>
    </div>
  );
};

export default MyEventsPage;
