import { useEffect, useMemo, useState } from "react";
import type { EventDoc } from "./useMyEvent";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

export type MyEventsOptions = {
  status?: "draft" | "published" | "archived" | "all";
  search?: string; // client-side filter on title
};

export function useMyEvents(opts: MyEventsOptions = {}) {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    setError(null);
    const res = await fetch(`${API_BASE}/api/events/mine`, {
      credentials: "include",
      signal,
    });
    if (!res.ok) throw new Error(await res.text());
    const data: EventDoc[] = await res.json();
    setEvents(data);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        await load(ac.signal);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Failed to load events");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  // lightweight client-side filtering/sorting
  const filtered = useMemo(() => {
    let list = events.slice();

    if (opts.status && opts.status !== "all") {
      list = list.filter((e) => e.status === opts.status);
    }

    if (opts.search && opts.search.trim()) {
      const q = opts.search.trim().toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q));
    }

    // newest first by startTime
    list.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    return list;
  }, [events, opts.status, opts.search]);

  return {
    events: filtered,
    rawEvents: events,
    loading,
    error,
    refetch: () => load().catch(() => {}),
    setEvents, 
  };
}

export default useMyEvents;
