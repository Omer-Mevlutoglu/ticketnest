import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "../components/Loading";
import BlurCircle from "../components/BlurCircle";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env.VITE_API_BASE || "http://localhost:5000";

type BookingItem = {
  seatCoords: { x: number; y: number };
  price: number;
};

type Booking = {
  _id: string;
  userId: string;
  eventId: string;
  items: BookingItem[];
  total: number;
  status: "unpaid" | "paid" | "failed" | "expired";
  expiresAt?: string; // ISO
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
};

type PublicEvent = {
  _id: string;
  title: string;
  description: string;
  categories: string[];
  venueName?: string;
  venueAddress?: string;
  startTime: string;
  endTime: string;
  poster?: string;
};

const PLACEHOLDER = "/placeholder.jpg";
const REFRESH_MS = 12000; // poll every 12s to let UI reflect expiry jobs

function formatDateTimeRange(startISO?: string, endISO?: string) {
  if (!startISO || !endISO) return "";
  const s = new Date(startISO);
  const e = new Date(endISO);
  const sameDay = s.toDateString() === e.toDateString();
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (d: Date) =>
    d.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return sameDay
    ? `${fmtDate(s)} • ${fmtTime(s)}–${fmtTime(e)}`
    : `${fmtDate(s)} ${fmtTime(s)} → ${fmtDate(e)} ${fmtTime(e)}`;
}

function useMyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchMine(signal?: AbortSignal) {
    setError(null);
    const res = await fetch(`${API_BASE}/api/bookings`, {
      credentials: "include",
      signal,
    });
    if (!res.ok) throw new Error(await res.text());
    const data: Booking[] = await res.json();
    setBookings(data);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        await fetchMine(ac.signal);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setError(e?.message || "Failed to load bookings");
      } finally {
        setLoading(false);
      }
    })();

    const t = setInterval(() => fetchMine().catch(() => {}), REFRESH_MS);

    return () => {
      ac.abort();
      clearInterval(t);
    };
  }, []);

  return {
    bookings,
    setBookings,
    loading,
    error,
    refetch: () => fetchMine().catch(() => {}),
  };
}

function useEventCache(eventIds: string[]) {
  const [eventsById, setEventsById] = useState<Record<string, PublicEvent>>({});

  useEffect(() => {
    const unique = Array.from(new Set(eventIds.filter(Boolean)));
    const missing = unique.filter((id) => !eventsById[id]);
    if (missing.length === 0) return;

    const ac = new AbortController();
    (async () => {
      try {
        const results = await Promise.all(
          missing.map(async (id) => {
            const res = await fetch(`${API_BASE}/api/events/${id}`, {
              signal: ac.signal,
              credentials: "include",
            });
            if (!res.ok) throw new Error(await res.text());
            const ev: PublicEvent = await res.json();
            return [id, ev] as const;
          })
        );
        setEventsById((prev) => {
          const next = { ...prev };
          for (const [id, ev] of results) next[id] = ev;
          return next;
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // ignore; per-card will degrade gracefully
      }
    })();

    return () => ac.abort();
  }, [eventIds.join(","), eventsById]); // eslint-disable-line react-hooks/exhaustive-deps

  return eventsById;
}

const MyBookings: React.FC = () => {
  const { bookings, loading, error } = useMyBookings();
  const navigate = useNavigate();

  const eventIds = useMemo(() => bookings.map((b) => b.eventId), [bookings]);
  const eventsById = useEventCache(eventIds);

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">
      <BlurCircle top="100px" left="100px" />
      <div>
        <BlurCircle bottom="0px" left="600px" />
      </div>

      <h1 className="text-lg font-semibold mb-4">My Bookings</h1>

      {bookings.length === 0 && (
        <div className="text-gray-400">No bookings yet.</div>
      )}

      {bookings.map((b) => {
        const ev = eventsById[b.eventId];
        const poster = ev?.poster || PLACEHOLDER;
        const when = formatDateTimeRange(ev?.startTime, ev?.endTime);
        const seats =
          b.items?.map((i) => `(${i.seatCoords.x},${i.seatCoords.y})`) || [];
        const seatCount = b.items?.length || 0;

        const expiresAt = b.expiresAt ? new Date(b.expiresAt).getTime() : null;
        const now = Date.now();
        const isExpiredByTime = expiresAt ? now >= expiresAt : false;
        const canPay = b.status === "unpaid" && !isExpiredByTime;

        // simple countdown (mm:ss)
        const remaining =
          canPay && expiresAt
            ? Math.max(0, Math.floor((expiresAt - now) / 1000))
            : 0;
        const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
        const ss = String(remaining % 60).padStart(2, "0");

        return (
          <div
            key={b._id}
            className="flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl"
          >
            <div className="flex flex-col md:flex-row">
              <img
                src={poster}
                alt={ev?.title || "Event"}
                className="md:max-w-45 aspect-video h-auto object-cover object-center rounded"
              />
              <div className="flex flex-col p-4">
                <p className="text-lg font-semibold">{ev?.title ?? "Event"}</p>
                <p className="text-sm text-gray-400">{when}</p>
                <p className="text-sm text-gray-400">
                  {ev?.venueName}
                  {ev?.venueAddress ? ` • ${ev.venueAddress}` : ""}
                </p>

                <div className="mt-auto flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border
                    ${
                      b.status === "paid"
                        ? "border-emerald-400 text-emerald-300"
                        : b.status === "unpaid"
                        ? "border-yellow-400 text-yellow-300"
                        : b.status === "expired"
                        ? "border-gray-400 text-red-600"
                        : "border-rose-400 text-rose-300"
                    }`}
                  >
                    {isExpiredByTime && b.status === "unpaid"
                      ? "expired"
                      : b.status}
                  </span>
                  {canPay && expiresAt && (
                    <span className="text-xs text-gray-400">
                      • Expires in {mm}:{ss}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col md:items-end md:text-right justify-between p-4">
              <div className="flex items-center gap-4">
                <p className="text-2xl font-semibold mb-3">
                  {b.total.toFixed(2)}
                </p>

                {canPay && (
                  <button
                    onClick={() => {
                      navigate(`/checkout/${b._id}`);
                    }}
                    className="bg-primary px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-pointer"
                  >
                    Pay now
                  </button>
                )}
              </div>

              <div className="text-sm">
                <p>
                  <span className="text-gray-400">Total Tickets </span>{" "}
                  {seatCount}
                </p>
                <p>
                  <span className="text-gray-400">Seats </span>{" "}
                  {seats.join(", ")}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MyBookings;
