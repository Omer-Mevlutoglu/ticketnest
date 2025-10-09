import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarIcon,
  Edit3Icon,
  EyeIcon,
  MapPinIcon,
  PlusIcon,
} from "lucide-react";
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";
import useMyEvents from "./hooks/useMyEvents";

const PLACEHOLDER = "/placeholder.jpg";

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
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>
      {status}
    </span>
  );
};

const MyEventsPage: React.FC = () => {
  const [status, setStatus] = useState<
    "all" | "draft" | "published" | "archived"
  >("all");
  const [search, setSearch] = useState("");
  const { events, loading, error, refetch } = useMyEvents({ status, search });
  const navigate = useNavigate();

  const counts = useMemo(() => {
    const c = { all: 0, draft: 0, published: 0, archived: 0 };
    for (const e of events) {
      c.all++;
      // counts are for the filtered list; if you want global counts, compute from rawEvents
      if (e.status === "draft") c.draft++;
      if (e.status === "published") c.published++;
      if (e.status === "archived") c.archived++;
    }
    return c;
  }, [events]);

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-center">
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
    <div className="relative px-6 md:px-10 lg:px-12 py-6">
      <BlurCircle top="-40px" right="-60px" />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Events</h1>
        <button
          onClick={() => navigate("/organizer/events/new")}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary hover:bg-primary-dull transition"
        >
          <PlusIcon className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* filters */}
      <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex gap-2">
          {(["all", "draft", "published", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded border ${
                status === s
                  ? "border-primary text-primary"
                  : "border-white/15 text-gray-300"
              }`}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <input
          placeholder="Search title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-64 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
        />
      </div>

      {/* list */}
      <div className="mt-6 space-y-4">
        {events.length === 0 && (
          <div className="text-sm text-gray-400 border border-white/10 rounded-lg p-6">
            No events match your filters.
          </div>
        )}

        {events.map((ev) => (
          <div
            key={ev._id}
            className="flex flex-col md:flex-row justify-between bg-white/5 border border-white/10 rounded-lg p-2"
          >
            <div className="flex gap-3">
              <img
                src={ev.poster || PLACEHOLDER}
                alt={ev.title}
                className="w-40 h-28 object-cover rounded"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{ev.title}</h3>
                  <StatusPill status={ev.status} />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  <CalendarIcon className="inline w-4 h-4 mr-1" />
                  {formatRange(ev.startTime, ev.endTime)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  <MapPinIcon className="inline w-4 h-4 mr-1" />
                  {ev.venueName}
                  {ev.venueAddress ? ` • ${ev.venueAddress}` : ""}
                </p>
                <div className="mt-auto text-xs text-gray-400">
                  Categories: {ev.categories?.join(", ") || "—"}
                </div>
              </div>
            </div>

            <div className="flex md:flex-col items-start md:items-end gap-2 md:text-right p-2">
              <Link
                to={`/organizer/events/${ev._id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-white/15 hover:bg-white/10 transition text-sm"
                title="Manage"
              >
                <Edit3Icon className="w-4 h-4" />
                Manage
              </Link>
              <Link
                to={`/events/${ev._id}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-white/15 hover:bg-white/10 transition text-sm"
                title="Public view"
                target="_blank"
                rel="noreferrer"
              >
                <EyeIcon className="w-4 h-4" />
                View
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* small footer stats */}
      <div className="mt-6 text-xs text-gray-400">
        Showing: <b>{events.length}</b> • Draft: <b>{counts.draft}</b> •
        Published: <b>{counts.published}</b> • Archived:{" "}
        <b>{counts.archived}</b>
      </div>
    </div>
  );
};

export default MyEventsPage;
