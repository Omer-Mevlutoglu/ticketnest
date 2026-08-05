import { useEffect, useState } from "react";
import { apiGet, errorMessage, isAbortError } from "../../../lib/api";


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
        const data = await apiGet<TemplateVenue[]>("/api/venues", ac.signal);
        setVenues(Array.isArray(data) ? data : []);
            } catch (e) {
        if (!isAbortError(e)) {
          setError(errorMessage(e, "Failed to load venues"));
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  return { venues, loading, error };
}
