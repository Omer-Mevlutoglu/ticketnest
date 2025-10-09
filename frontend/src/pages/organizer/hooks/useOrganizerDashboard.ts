import { useEffect, useMemo, useState } from "react";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

export type OrganizerEvent = {
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
  seatMapId?: string;
  startTime: string;
  endTime: string;
  poster?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OrganizerStats = {
  eventCount: number;
  publishedCount: number;
  draftCount: number;
  archivedCount: number;
  upcomingCount: number;
  totalRevenue: number;
  ticketsSold: number;
};

export function useOrganizerDashboard() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchAll(signal?: AbortSignal) {
    setError(null);
    const [evRes, stRes] = await Promise.all([
      fetch(`${API_BASE}/api/events/mine`, { credentials: "include", signal }),
      fetch(`${API_BASE}/api/organizer/stats`, {
        credentials: "include",
        signal,
      }),
    ]);

    if (!evRes.ok) throw new Error(await evRes.text());
    if (!stRes.ok) throw new Error(await stRes.text());

    const evData: OrganizerEvent[] = await evRes.json();
    const stData: OrganizerStats = await stRes.json();

    setEvents(Array.isArray(evData) ? evData : []);
    setStats(stData);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        await fetchAll(ac.signal);
      } catch (e: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((e as any)?.name !== "AbortError") {
          setError((e as Error)?.message || "Failed to load dashboard");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const nextEvent = useMemo(() => {
    const now = Date.now();
    return events
      .filter(
        (e) => e.status === "published" && new Date(e.startTime).getTime() > now
      )
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )[0] ?? null;
  }, [events]);

  return {
    events,
    stats,
    nextEvent,
    loading,
    error,
    refetch: () => fetchAll().catch(() => {}),
  };
}
