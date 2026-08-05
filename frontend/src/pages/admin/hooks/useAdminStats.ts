import { useEffect, useState } from "react";
import { apiGet, errorMessage, isAbortError } from "../../../lib/api";


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
    const json = await apiGet<AdminStats>(`/api/admin/stats`, signal);
    setData(json);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        await load(ac.signal);
            } catch (e) {
        if (!isAbortError(e))
          setError(errorMessage(e, "Failed to load admin stats"));
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  return { data, loading, error, refetch: () => load().catch(() => {}) };
}
