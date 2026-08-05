import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost } from "../lib/api";

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchFavorites(signal?: AbortSignal) {
    const arr = await apiGet<string[]>("/api/favorites", signal);
    setIds(arr.map(String));
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
    const arr = await apiPost<string[]>(`/api/favorites/${eventId}`);
    setIds(arr.map(String));
  }

  async function remove(eventId: string) {
    const arr = await apiDelete<string[]>(`/api/favorites/${eventId}`);
    setIds(arr.map(String));
  }

  async function toggle(eventId: string) {
    // Optimistic — the star flips immediately and reverts if the call fails.
    const has = ids.includes(eventId);
    setIds((prev) =>
      has ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
    try {
      const arr = await apiPost<string[]>(`/api/favorites/${eventId}/toggle`);
      setIds(arr.map(String));
    } catch {
      setIds((prev) =>
        has ? [...prev, eventId] : prev.filter((id) => id !== eventId)
      );
    }
  }

  return {
    ids,
    loading,
    add,
    remove,
    toggle,
    refetch: () => fetchFavorites().catch(() => {}),
  };
}
