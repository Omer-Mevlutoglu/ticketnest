import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";
import { ShieldCheckIcon, PencilIcon, LayoutGridIcon } from "lucide-react";
import toast from "react-hot-toast";

type EventRow = {
  _id: string;
  title: string;
  status: "draft" | "published";
  venueType: "template" | "custom";
  startTime: string; // ISO
  endTime: string; // ISO
  hasSeatMap?: boolean;
};

const MOCK_EVENTS: EventRow[] = [
  {
    _id: "e1",
    title: "City Lights — Live DJ Night",
    status: "published",
    venueType: "template",
    startTime: new Date(Date.now() + 86400000).toISOString(),
    endTime: new Date(Date.now() + 90000000).toISOString(),
    hasSeatMap: true,
  },
  {
    _id: "e2",
    title: "Local Standup",
    status: "draft",
    venueType: "custom",
    startTime: new Date(Date.now() + 2 * 86400000).toISOString(),
    endTime: new Date(Date.now() + 2 * 86400000 + 7200000).toISOString(),
    hasSeatMap: false,
  },
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

const MyEvents: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EventRow[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ data: EventRow[] }>("/api/events/mine");
        setRows(data.data);
      } catch {
        setRows(MOCK_EVENTS); // fallback so UI renders
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const publish = async (id: string) => {
    try {
      await api(`/api/events/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "published" }),
      });
      toast.success("Event published");
      setRows((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status: "published" } : r))
      );
    } catch (e: any) {
      toast.error(e?.message || "Failed to publish");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">
      <BlurCircle top="60px" left="100px" />
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-lg font-semibold">My Events</h1>
        <Link
          to="/organizer/events/new"
          className="px-4 py-2 rounded-full bg-primary hover:bg-primary-dull transition text-sm font-medium"
        >
          Create Event
        </Link>
      </div>

      <div className="space-y-4 max-w-4xl">
        {rows.map((e) => {
          const canPublish =
            e.status === "draft" &&
            (e.venueType === "template" || e.hasSeatMap);
          return (
            <div
              key={e._id}
              className="border border-primary/20 bg-primary/10 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{e.title}</h3>
                  <p className="text-sm text-gray-400">
                    {new Date(e.startTime).toLocaleString()} —{" "}
                    {new Date(e.endTime).toLocaleTimeString()}
                  </p>
                  <div className="mt-2 text-xs text-gray-300">
                    <span className="chip">Venue: {e.venueType}</span>{" "}
                    <span
                      className={`chip-${
                        e.status === "published" ? "approved" : "pending"
                      }`}
                    >
                      {e.status.toUpperCase()}
                    </span>{" "}
                    <span className="chip">
                      {e.hasSeatMap ? "Seat map ✓" : "No seat map"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/organizer/events/${e._id}/edit`)}
                    className="btn-outline flex items-center gap-2 px-3 py-1.5 rounded-md"
                  >
                    <PencilIcon className="w-4 h-4" /> Edit
                  </button>

                  <button
                    onClick={() =>
                      navigate(`/organizer/events/${e._id}/seatmap`)
                    }
                    className="btn-outline flex items-center gap-2 px-3 py-1.5 rounded-md"
                  >
                    <LayoutGridIcon className="w-4 h-4" /> Seat Map
                  </button>

                  <button
                    disabled={!canPublish}
                    onClick={() => publish(e._id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition 
                      ${
                        canPublish
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-emerald-600/30 text-white/60 cursor-not-allowed"
                      }`}
                  >
                    <ShieldCheckIcon className="w-4 h-4" />
                    Publish
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-gray-400">No events yet.</p>}
      </div>
    </div>
  );
};

export default MyEvents;
