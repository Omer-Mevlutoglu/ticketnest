import { useEffect, useState } from "react";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

export type PublicEvent = {
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

export function useFavoriteEvents(ids: string[]) {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    async function load() {
      setError(null);
      setLoading(true);

      try {
        // Dedup & fetch each id in parallel (no bulk endpoint available)
        const unique = Array.from(new Set(ids)).filter(Boolean);
        if (unique.length === 0) {
          setEvents([]);
          return;
        }

        const results = await Promise.allSettled(
          unique.map(async (id) => {
            const res = await fetch(`${API_BASE}/api/events/${id}`, {
              credentials: "include",
              signal: ac.signal,
            });
            if (!res.ok) throw new Error(await res.text());
            const ev: PublicEvent = await res.json();
            return ev;
          })
        );

        // Keep only fulfilled
        const evs = results
          .filter(
            (r): r is PromiseFulfilledResult<PublicEvent> =>
              r.status === "fulfilled"
          )
          .map((r) => r.value);

        // Preserve original order (ids array)
        const byId = new Map(evs.map((e) => [e._id, e]));
        setEvents(
          ids.map((id) => byId.get(id)).filter(Boolean) as PublicEvent[]
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Failed to load favorite events");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => ac.abort();
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { events, loading, error };
}
