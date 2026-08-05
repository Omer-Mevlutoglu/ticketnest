import { useEffect, useState } from "react";
import { apiGet, errorMessage } from "@/lib/api";


export type EventDoc = {
  _id: string;
  organizerId: string;
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
  seatMapId?: string;
  poster?: string;
};

export type Seat = {
  x: number;
  y: number;
  tier: string;
  price: number;
  status: "available" | "reserved" | "sold";
};

export type SeatMapDoc = {
  _id: string;
  eventId: string;
  layoutType: "grid";
  seats: Seat[];
};

export function useMyEvent(eventId: string | undefined) {
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMapDoc | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    if (!eventId) return;
    setError(null);
    setLoading(true);

    try {
      // organizer-owned detail
      setEvent(await apiGet<EventDoc>(`/api/events/mine/${eventId}`, signal));

      // A missing seat map is normal for a draft event.
      try {
        setSeatMap(
          await apiGet<SeatMapDoc>(`/api/events/${eventId}/seatmap`, signal)
        );
      } catch {
        setSeatMap(null);
      }
          } catch (e) {
      setError(errorMessage(e, "Failed to load event"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [eventId]);

  const seatSummary = seatMap
    ? seatMap.seats.reduce(
        (acc, s) => {
          acc.total += 1;
          acc[s.status] += 1;
          return acc;
        },
        { total: 0, available: 0, reserved: 0, sold: 0 }
      )
    : null;

  return {
    event,
    seatMap,
    seatSummary,
    loading,
    error,
    refetch: () => load().catch(() => {}),
    setEvent, // allow optimistic updates if you like
  };
}
