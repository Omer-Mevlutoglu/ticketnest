import { useEffect, useMemo, useState } from "react";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

export type BookingItem = {
  seatCoords: { x: number; y: number };
  price: number;
};

export type Booking = {
  _id: string;
  userId: string;
  eventId: string;
  items: BookingItem[];
  total: number;
  status: "unpaid" | "paid" | "failed" | "expired";
  expiresAt?: string; // ISO
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
};

export type PublicEvent = {
  _id: string;
  title: string;
  venueName?: string;
  venueAddress?: string;
  startTime: string;
  endTime: string;
  poster?: string;
};

function formatDateTimeRange(startISO?: string, endISO?: string) {
  if (!startISO || !endISO) return "";
  const s = new Date(startISO);
  const e = new Date(endISO);
  const sameDay = s.toDateString() === e.toDateString();
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (d: Date) =>
    d.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return sameDay
    ? `${fmtDate(s)} • ${fmtTime(s)}–${fmtTime(e)}`
    : `${fmtDate(s)} ${fmtTime(s)} → ${fmtDate(e)} ${fmtTime(e)}`;
}

export function useCheckout(bookingId?: string) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState<"pay" | "fail" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchBookingAndEvent(signal?: AbortSignal) {
    if (!bookingId) return;

    setError(null);
    setLoading(true);
    try {
      // 1) pull all my bookings & find the one
      const res = await fetch(`${API_BASE}/api/bookings`, {
        credentials: "include",
        signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const all: Booking[] = await res.json();
      const found = all.find((b) => b._id === bookingId) || null;
      setBooking(found);
      if (!found) return;

      // 2) fetch event data
      try {
        const evRes = await fetch(`${API_BASE}/api/events/${found.eventId}`, {
          credentials: "include",
          signal,
        });
        if (evRes.ok) {
          const ev: PublicEvent = await evRes.json();
          setEvent(ev);
        } else {
          setEvent(null);
        }
      } catch {
        setEvent(null);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e?.message || "Failed to load checkout");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    fetchBookingAndEvent(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  // derived helpers
  const seats = useMemo(
    () =>
      booking?.items?.map((i) => `(${i.seatCoords.x},${i.seatCoords.y})`) ?? [],
    [booking]
  );

  const when = useMemo(
    () => formatDateTimeRange(event?.startTime, event?.endTime),
    [event]
  );

  const expiresAt = booking?.expiresAt
    ? new Date(booking.expiresAt).getTime()
    : null;
  const now = Date.now();
  const isExpired =
    booking?.status === "expired" || (expiresAt ? now >= expiresAt : false);
  const canPay = booking?.status === "unpaid" && !isExpired;

  // live countdown
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    if (!canPay || !expiresAt) return;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [canPay, expiresAt]);

  const remaining =
    canPay && expiresAt
      ? Math.max(0, Math.floor((expiresAt - tick) / 1000))
      : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const countdown = canPay ? `${mm}:${ss}` : null;

  async function mockPay(): Promise<void> {
    if (!booking) return;
    setPosting("pay");
    try {
      const res = await fetch(
        `${API_BASE}/api/bookings/${booking._id}/pay-test`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Payment failed");
    } finally {
      setPosting(null);
    }
  }

  async function mockFail(): Promise<void> {
    if (!booking) return;
    setPosting("fail");
    try {
      const res = await fetch(
        `${API_BASE}/api/bookings/${booking._id}/fail-test`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      const text = await res.text();
      if (!res.ok) throw new Error(text || "Failure call failed");
    } finally {
      setPosting(null);
    }
  }

  return {
    // data
    booking,
    event,
    seats,
    when,
    // state
    loading,
    error,
    posting,
    // derived
    canPay,
    isExpired,
    countdown,
    // actions
    mockPay,
    mockFail,
    refetch: () => fetchBookingAndEvent().catch(() => {}),
  };
}
