import { useEffect, useState } from "react";
import { apiGet, errorMessage, isAbortError } from "../lib/api";

export type PublicEvent = {
  _id: string;
  title: string;
  description: string;
  categories: string[];
  status: "draft" | "published" | "archived";
  venueType: "custom" | "template";
  templateVenueId?: string;
  venueName?: string;
  venueAddress?: string;
  startTime: string; // ISO
  endTime: string; // ISO
  poster?: string;
};

export type VenueDetail = {
  _id: string;
  name: string;
  address: string;
  images: string[];
  description?: string;
};

export function useEventDetails(eventId: string | undefined) {
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [venue, setVenue] = useState<VenueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setVenue(null);

        const ev = await apiGet<PublicEvent>(
          `/api/events/${eventId}`,
          ac.signal
        );
        setEvent(ev);

        // Template venues carry their own images; a failure here is not fatal,
        // the page still renders from the event poster.
        if (ev.venueType === "template" && ev.templateVenueId) {
          try {
            setVenue(
              await apiGet<VenueDetail>(
                `/api/venues/${ev.templateVenueId}`,
                ac.signal
              )
            );
          } catch (venueErr) {
            if (!isAbortError(venueErr)) {
              console.warn("Venue fetch failed:", errorMessage(venueErr));
            }
          }
        }
      } catch (e) {
        if (isAbortError(e)) return;
        setError(errorMessage(e, "Failed to load event"));
        setEvent(null);
        setVenue(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [eventId]);

  return { event, venue, loading, error };
}
