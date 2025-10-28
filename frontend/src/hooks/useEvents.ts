import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// This is the full event type from your backend
export type ApiEvent = {
  _id: string;
  title: string;
  description: string;
  categories: string[];
  status: "draft" | "published" | "archived";
  venueType: "custom" | "template";
  templateVenueId?: string;
  venueName?: string;
  venueAddress?: string;
  startTime: string;
  endTime: string;
  poster?: string;
  // This is a new field from the venue, for the upcoming section
  venueImages?: string[];
};

// We will fetch ALL public events once, and components can filter it.
const useEvents = () => {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Get the user

  useEffect(() => {
    // Do not fetch if the user is not logged in (per your app's design)
    if (!user) return;

    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/api/events`, {
          // Add credentials to the fetch, as this is an authenticated route
          credentials: "include",
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
  }, [user]); // Re-run if the user logs in

  return { events, loading, error };
};

export default useEvents;
