import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../lib/api";

/** Summary shape returned alongside the id list. */
export type FavoriteEvent = {
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

type FavoritesResponse = { ids: string[]; events: FavoriteEvent[] };

/**
 * Favourites, in one request.
 *
 * The listing returns both the ids (which the star toggles key on) and the
 * event summaries, so the favourites page no longer fetches each event
 * separately. Mutations return just the ids — that is all a toggle needs.
 */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [events, setEvents] = useState<FavoriteEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchFavorites(signal?: AbortSignal) {
    const res = await apiGet<FavoritesResponse>("/api/favorites", signal);
    setIds(res.ids.map(String));
    setEvents(res.events ?? []);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        await fetchFavorites(ac.signal);
      } catch {
        // Signed-out visitors have no favourites; nothing to report.
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  async function add(eventId: string) {
    setIds((await apiPost<string[]>(`/api/favorites/${eventId}`)).map(String));
  }

  async function remove(eventId: string) {
    setIds((await apiDelete<string[]>(`/api/favorites/${eventId}`)).map(String));
    setEvents((prev) => prev.filter((e) => e._id !== eventId));
  }

  async function toggle(eventId: string) {
    // Optimistic — the star flips immediately and reverts if the call fails.
    const has = ids.includes(eventId);
    setIds((prev) =>
      has ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
    try {
      const next = await apiPost<string[]>(`/api/favorites/${eventId}/toggle`);
      setIds(next.map(String));
      if (has) setEvents((prev) => prev.filter((e) => e._id !== eventId));
    } catch {
      setIds((prev) =>
        has ? [...prev, eventId] : prev.filter((id) => id !== eventId)
      );
    }
  }

  return {
    ids,
    events,
    loading,
    add,
    remove,
    toggle,
    refetch: () => fetchFavorites().catch(() => {}),
  };
}
