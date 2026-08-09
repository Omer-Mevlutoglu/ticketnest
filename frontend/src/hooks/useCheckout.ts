import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, errorMessage, isApiError } from "../lib/api";

export type BookingItem = {
  seatCoords: { x: number; y: number };
  price: number;
};

export type Booking = {
  _id: string;
  userId: string;
  eventId: string;
  /** Joined server-side — see getMyBookings. */
  event: PublicEvent | null;
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
      // One request: the booking arrives with its event already attached.
      const all = await apiGet<Booking[]>("/api/bookings", signal);
      const found = all.find((b) => b._id === bookingId) || null;
      setBooking(found);
      setEvent(found?.event ?? null);
    } catch (e) {
      setError(errorMessage(e, "Failed to load checkout"));
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

  /** Turns a payment failure into something a person can act on. */
  function paymentError(err: unknown, fallback: string): Error {
    if (isApiError(err)) {
      if (err.status === 410)
        return new Error("This seat hold has expired. Please book again.");
      if (err.status === 409)
        return new Error(err.message || "These seats are no longer available.");
      if (err.status === 404)
        return new Error("Simulated payments are disabled on this server.");
    }
    return new Error(errorMessage(err, fallback));
  }

  // No amount is sent: the server charges the booking's stored total. A body
  // here could not change what is paid.
  async function mockPay(): Promise<void> {
    if (!booking) return;
    setPosting("pay");
    try {
      await apiPost(`/api/bookings/${booking._id}/mock-pay`);
    } catch (err) {
      throw paymentError(err, "Payment failed");
    } finally {
      setPosting(null);
    }
  }

  async function mockFail(): Promise<void> {
    if (!booking) return;
    setPosting("fail");
    try {
      await apiPost(`/api/bookings/${booking._id}/mock-fail`);
    } catch (err) {
      throw paymentError(err, "Failure call failed");
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
