import { useEffect, useState } from "react";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

export type AdminStats = {
  users: {
    total: number;
    attendees: number;
    organizers: number;
    approvedOrganizers: number;
    pendingOrganizers: number;
  };
  events: {
    total: number;
    draft: number;
    published: number;
    archived: number;
  };
  bookings: {
    total: number;
    paid: number;
    unpaid: number;
    expired: number;
    failed: number;
    revenue: number;
  };
  seats: {
    total: number;
    sold: number;
    reserved: number;
    available: number;
  };
  topEvents: Array<{
    eventId: string;
    title: string;
    revenue: number;
    tickets: number;
    startTime?: string;
    status: "draft" | "published" | "archived";
  }>;
};

export function useAdminStats() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    setError(null);
    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      credentials: "include",
      signal,
    });
    if (!res.ok) throw new Error(await res.text());
    const json: AdminStats = await res.json();
    setData(json);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        await load(ac.signal);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setError(e?.message || "Failed to load admin stats");
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  return { data, loading, error, refetch: () => load().catch(() => {}) };
}
