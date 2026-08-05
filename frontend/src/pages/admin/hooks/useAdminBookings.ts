import { useEffect, useState } from "react";
import { apiGet, errorMessage, isAbortError } from "../../../lib/api";


export type BookingStatus = "unpaid" | "paid" | "failed" | "expired";

export type BookingItem = {
  seatCoords: { x: number; y: number };
  price: number;
};

export type BookingRow = {
  _id: string;
  userId: { _id: string; email?: string; username?: string; role: string };
  eventId: {
    _id: string;
    title: string;
    startTime?: string;
    endTime?: string;
    venueName?: string;
    venueAddress?: string;
    poster?: string;
  };
  items: BookingItem[];
  total: number;
  status: BookingStatus;
  expiresAt?: string;
  createdAt?: string;
};

export function useAdminBookings(initialStatus?: BookingStatus | "all") {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [status, setStatus] = useState<BookingStatus | "all">(
    initialStatus || "all"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchAll(signal?: AbortSignal) {
    setError(null);
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);

    const data = await apiGet<BookingRow[]>(`/api/admin/bookings?${params.toString()}`, signal);
    setBookings(data);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        await fetchAll(ac.signal);
              } catch (e) {
        if (!isAbortError(e))
          setError(errorMessage(e, "Failed to load bookings"));
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return {
    bookings,
    status,
    setStatus,
    loading,
    error,
    refetch: () => fetchAll().catch(() => {}),
  };
}
