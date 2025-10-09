import { useEffect, useState } from "react";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

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
      const evRes = await fetch(`${API_BASE}/api/events/mine/${eventId}`, {
        credentials: "include",
        signal,
      });
      if (!evRes.ok) throw new Error(await evRes.text());
      const ev: EventDoc = await evRes.json();
      setEvent(ev);

      // seat map (public endpoint is fine)
      try {
        const smRes = await fetch(`${API_BASE}/api/events/${eventId}/seatmap`, {
          credentials: "include",
          signal,
        });
        if (smRes.ok) {
          const sm: SeatMapDoc = await smRes.json();
          setSeatMap(sm);
        } else {
          setSeatMap(null);
        }
      } catch {
        setSeatMap(null);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.message || "Failed to load event");
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
