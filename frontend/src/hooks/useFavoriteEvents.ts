import { useEffect, useState } from "react";
import { apiGet, errorMessage, isAbortError } from "../lib/api";

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
        const unique = Array.from(new Set(ids)).filter(Boolean);
        if (unique.length === 0) {
          setEvents([]);
          return;
        }

        // TODO(WP4.4): this is one request per favourite. Have GET
        // /api/favorites populate and return the events instead.
        const results = await Promise.allSettled(
          unique.map((id) => apiGet<PublicEvent>(`/api/events/${id}`, ac.signal))
        );

        const found = results
          .filter(
            (r): r is PromiseFulfilledResult<PublicEvent> =>
              r.status === "fulfilled"
          )
          .map((r) => r.value);

        // Preserve the order of the ids array.
        const byId = new Map(found.map((e) => [e._id, e]));
        setEvents(
          ids.map((id) => byId.get(id)).filter(Boolean) as PublicEvent[]
        );
      } catch (e) {
        if (isAbortError(e)) return;
        setError(errorMessage(e, "Failed to load favorite events"));
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => ac.abort();
  }, [ids.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { events, loading, error };
}
