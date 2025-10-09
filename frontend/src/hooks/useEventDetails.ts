import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

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
  endTime: string;   // ISO
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

        // 1) fetch event
        const evRes = await fetch(`${API_BASE}/api/events/${eventId}`, {
          signal: ac.signal,
        });
        if (!evRes.ok) throw new Error(await evRes.text());
        const ev: PublicEvent = await evRes.json();
        setEvent(ev);

        // 2) if template venue → fetch venue images
        if (ev.venueType === "template" && ev.templateVenueId) {
          const vRes = await fetch(`${API_BASE}/api/venues/${ev.templateVenueId}`, {
            signal: ac.signal,
          });
          if (vRes.ok) {
            const v: VenueDetail = await vRes.json();
            setVenue(v);
          } else {
            // not fatal—details page still works with poster
            console.warn("Venue fetch failed:", await vRes.text());
          }
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Failed to load event");
          setEvent(null);
          setVenue(null);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [eventId]);

  return { event, venue, loading, error };
}
