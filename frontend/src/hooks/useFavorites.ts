import { useEffect, useState } from "react";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchFavorites(signal?: AbortSignal) {
    const res = await fetch(`${API_BASE}/api/favorites`, {
      credentials: "include",
      signal,
    });
    if (!res.ok) throw new Error(await res.text());
    const arr: string[] = await res.json();
    setIds(arr.map(String));
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        await fetchFavorites(ac.signal);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  async function add(eventId: string) {
    const res = await fetch(`${API_BASE}/api/favorites/${eventId}`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) throw new Error(await res.text());
    const arr: string[] = await res.json();
    setIds(arr.map(String));
  }

  async function remove(eventId: string) {
    const res = await fetch(`${API_BASE}/api/favorites/${eventId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error(await res.text());
    const arr: string[] = await res.json();
    setIds(arr.map(String));
  }

  async function toggle(eventId: string) {
    // optimistic
    const has = ids.includes(eventId);
    setIds((prev) =>
      has ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
    try {
      const res = await fetch(`${API_BASE}/api/favorites/${eventId}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const arr: string[] = await res.json();
      setIds(arr.map(String));
    } catch {
      // revert on failure
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
