import { useEffect, useState } from "react";
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

type ApiEvent = {
  _id: string;
  title: string;
  categories?: string[];
  startTime: string;
  endTime: string;
  venueName?: string;
  venueAddress?: string;
  poster?: string;
};


const useFeaturedEvents = () => {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/events`, {
          signal: ac.signal,
        });
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || "Failed to load events");
        }
        const data: ApiEvent[] = await res.json();
        setEvents(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Failed to load events");
          setEvents([]);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  return { events, loading, error };
};

export default useFeaturedEvents;
