import { useEffect, useState } from "react";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

export type TemplateVenue = {
  _id: string;
  name: string;
  address: string;
  capacity: number;
  description?: string;
  images?: string[];
  defaultSeatMap?: Array<{ x: number; y: number; tier: string; price: number }>;
};

export function useTemplateVenues() {
  const [venues, setVenues] = useState<TemplateVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/venues`, {
          credentials: "include",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(await res.text());
        const data: TemplateVenue[] = await res.json();
        setVenues(Array.isArray(data) ? data : []);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Failed to load venues");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  return { venues, loading, error };
}
