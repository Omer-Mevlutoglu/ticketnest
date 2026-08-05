import { useEffect, useState } from "react";
import { apiGet, errorMessage, isAbortError } from "../lib/api";

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

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Public endpoint — no sign-in required.
        setEvents(await apiGet<ApiEvent[]>("/api/events", ac.signal));
      } catch (e) {
        if (isAbortError(e)) return;
        setError(errorMessage(e, "Failed to load events"));
        setEvents([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  return { events, loading, error };
};

export default useEvents;
