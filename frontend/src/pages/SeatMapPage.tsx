import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import toast from "react-hot-toast";
import Loading from "../components/Loading";
import BlurCircle from "../components/BlurCircle";

type Seat = {
  x: number;
  y: number;
  tier: string;
  price: number;
  status: "available" | "reserved" | "sold";
  reservedBy?: string;
  reservedUntil?: string;
};

type SeatMap = {
  _id: string;
  eventId: string;
  layoutType: "grid";
  seats: Seat[];
};

// Added Booking type returned from the API
type BookingResponse = {
  _id: string;
  // ... other booking fields if needed
};

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env.VITE_API_BASE || "http://localhost:5000";
const MAX_SELECT = 6; // max seats user can select at once

const SeatMapPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Add loading state for the booking creation process
  const [isBooking, setIsBooking] = useState(false);

  // selection is keyed by "x,y"
  const [selected, setSelected] = useState<Map<string, Seat>>(new Map());

  // fetch seat map
  useEffect(() => {
    if (!eventId) return;
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setSelected(new Map()); // Clear selection when map loads/reloads

        const res = await fetch(`${API_BASE}/api/events/${eventId}/seatmap`, {
          signal: ac.signal,
          credentials: "include",
        });
        if (!res.ok) throw new Error(await res.text());
        const data: SeatMap = await res.json();
        setSeatMap(data);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Failed to load seat map");
          setSeatMap(null);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [eventId]);

  // Build grid dims + map
  const { rows, cols, seatByKey } = useMemo(() => {
    const m = new Map<string, Seat>();
    let maxX = 0,
      maxY = 0;
    for (const s of seatMap?.seats || []) {
      m.set(`${s.x},${s.y}`, s);
      if (s.x > maxX) maxX = s.x;
      if (s.y > maxY) maxY = s.y;
    }
    return { rows: maxX, cols: maxY, seatByKey: m };
  }, [seatMap]);

  const totalPrice = useMemo(() => {
    let t = 0;
    for (const s of selected.values()) t += s.price;
    return t;
  }, [selected]);

  const toggleSeat = (key: string) => {
    const seat = seatByKey.get(key);
    if (!seat) return;
    if (seat.status !== "available") {
      toast.error("This seat is not available");
      return;
    }
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        if (next.size >= MAX_SELECT) {
          toast.error(`You can select up to ${MAX_SELECT} seats`);
          return prev;
        }
        next.set(key, seat);
      }
      return next;
    });
  };

  const proceedToCheckout = async () => {
    if (!eventId) return;
    if (selected.size === 0) {
      toast.error("Please select at least one seat");
      return;
    }
    setIsBooking(true); // Set booking loading state
    try {
      const seats = Array.from(selected.values()).map((s) => ({
        x: s.x,
        y: s.y,
      }));
      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, seats }),
      });
      if (!res.ok) throw new Error(await res.text());
      // --- IMPROVED NAVIGATION ---
      // 1. Get the booking ID from the response
      const booking: BookingResponse = await res.json();
      toast.success("Seats held — complete your checkout!");
      // 2. Navigate directly to the checkout page for this booking
      navigate(`/checkout/${booking._id}`);
      // --- END IMPROVEMENT ---
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast.error(e?.message || "Failed to create booking");
    } finally {
      setIsBooking(false); // Clear booking loading state
    }
  };

  if (loading) return <Loading />;
  if (error || !seatMap) {
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <p className="text-red-400">{error || "Seat map not found"}</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-16 xl:px-40 py-30 md:pt-50" // Adjusted padding
      id="seatmap"
    >
      {/* Left column: legend + summary */}
      <div className="w-full md:w-60 flex-shrink-0 bg-primary/10 border border-primary/20 rounded-lg py-6 h-max md:sticky md:top-30">
        <p className="text-lg font-semibold px-6 mb-4">Your Selection</p>
        <div className="px-6 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span>Seats</span>
            <span className="tabular-nums">{selected.size}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Total</span>
            <span className="tabular-nums">{totalPrice.toFixed(2)}</span>
          </div>
        </div>

        <div className="px-6 mt-6 text-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-emerald-500/60 border border-emerald-400/60" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-yellow-500/50 border border-yellow-400/60" />
            <span>Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-rose-500/60 border border-rose-400/60" />
            <span>Sold</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-primary/80 border border-primary/60" />
            <span>Selected</span>
          </div>
        </div>

        {/* Checkout Button (moved here for mobile) */}
        <div className="px-6 mt-6 md:hidden">
          <button
            onClick={proceedToCheckout}
            disabled={isBooking || selected.size === 0} // Disable while booking or if none selected
            className="w-full flex items-center justify-center gap-2 px-5 py-2 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isBooking ? "Booking..." : "Proceed to checkout"}
          </button>
        </div>
      </div>

      {/* Right: grid */}
      <div className="relative flex-1 flex flex-col items-center max-md:mt-8">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />

        <h1 className="text-2xl font-semibold mb-2">Select Your Seats</h1>
        <p className="text-gray-400 text-sm mb-6">SCREEN SIDE</p>

        {/* --- RESPONSIVENESS FIX --- */}
        {/* Wrap the grid in a horizontally scrollable container */}
        <div className="w-full overflow-x-auto pb-4 no-scrollbar">
          {/* Use min-w-max to allow grid to expand */}
          <div className="flex flex-col items-center gap-2 min-w-max px-2">
            {/* Grid seats */}
            {Array.from({ length: rows }, (_, ix) => {
              const x = ix + 1;
              return (
                <div key={x} className="flex gap-2">
                  {Array.from({ length: cols }, (_, iy) => {
                    const y = iy + 1;
                    const key = `${x},${y}`;
                    const seat = seatByKey.get(key);
                    if (!seat) {
                      // No seat at this position → spacer
                      return <span key={key} className="w-8 h-8" />;
                    }

                    const selectedHere = selected.has(key);
                    const base =
                      "w-8 h-8 rounded border text-xs grid place-items-center cursor-pointer transition";
                    const styleByStatus: Record<Seat["status"], string> = {
                      available:
                        "border-emerald-400/60 bg-emerald-500/20 hover:bg-emerald-500/30",
                      reserved:
                        "border-yellow-400/60 bg-yellow-500/30 cursor-not-allowed",
                      sold: "border-rose-400/60 bg-rose-500/40 cursor-not-allowed",
                    };
                    const selectedStyle =
                      "bg-primary text-white border-primary";

                    return (
                      <button
                        key={key}
                        onClick={() => toggleSeat(key)}
                        disabled={seat.status !== "available"}
                        className={`${base} ${
                          selectedHere
                            ? selectedStyle
                            : styleByStatus[seat.status]
                        }`}
                        title={`${seat.tier} • ${seat.price.toFixed(2)}`}
                      >
                        {x}-{y}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        {/* --- END RESPONSIVENESS FIX --- */}

        {/* Checkout Button (desktop only) */}
        <button
          onClick={proceedToCheckout}
          disabled={isBooking || selected.size === 0} // Disable while booking or if none selected
          className="hidden md:flex items-center gap-2 mt-10 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {isBooking ? "Booking..." : "Proceed to checkout"}
        </button>
      </div>
    </div>
  );
};

export default SeatMapPage;
