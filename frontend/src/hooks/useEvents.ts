import { useEffect, useState } from "react";
import { apiGet, apiGetAll, errorMessage, isAbortError, type Page } from "../lib/api";

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
        setEvents(await apiGetAll<ApiEvent>("/api/events", ac.signal));
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

export const EVENTS_PER_PAGE = 12;

/** The paged public listing used by /events. */
export const useEventsPage = (page: number) => {
  const [result, setResult] = useState<Page<ApiEvent>>({
    data: [],
    total: 0,
    page,
    limit: EVENTS_PER_PAGE,
    pageCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    apiGet<Page<ApiEvent>>(
      `/api/events?page=${page}&limit=${EVENTS_PER_PAGE}`,
      ac.signal
    )
      .then(setResult)
      .catch((caught) => {
        if (isAbortError(caught)) return;
        setError(errorMessage(caught, "Failed to load events"));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [page]);

  return { ...result, events: result.data, loading, error };
};
