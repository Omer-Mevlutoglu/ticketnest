import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import toast from "react-hot-toast";
import Loading from "../components/Loading";
import BlurCircle from "../components/BlurCircle";
import { apiGet, apiPost, errorMessage, isAbortError } from "../lib/api";
import { tierStyle } from "../lib/seatTiers";
import { calculateSeatTotal } from "../lib/seatSelection";

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

// Mirrors MAX_SEATS_PER_BOOKING in the backend's bookingService — the server
// enforces it too, this is only to fail fast in the UI.
const MAX_SELECT = 6;

interface SeatMapPageProps {
  mode?: "booking" | "organizer-preview";
}

const SeatMapPage: React.FC<SeatMapPageProps> = ({ mode = "booking" }) => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isPreview = mode === "organizer-preview";

  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Add loading state for the booking creation process
  const [isBooking, setIsBooking] = useState(false);

  // selection is keyed by "x,y"
  const [selected, setSelected] = useState<Map<string, Seat>>(new Map());

  // Roving tabindex: exactly one seat is in the tab order at a time, and the
  // arrow keys move between them. Tabbing through hundreds of buttons to reach
  // the middle of a venue is not a usable keyboard experience.
  const [focused, setFocused] = useState<{ x: number; y: number }>({
    x: 1,
    y: 1,
  });

  // fetch seat map
  useEffect(() => {
    if (!eventId) return;
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setSelected(new Map()); // Clear selection when map loads/reloads

        const endpoint = isPreview
          ? `/api/events/mine/${eventId}/seatmap`
          : `/api/events/${eventId}/seatmap`;
        setSeatMap(await apiGet<SeatMap>(endpoint, ac.signal));
      } catch (e) {
        if (isAbortError(e)) return;
        setError(errorMessage(e, "Failed to load seat map"));
        setSeatMap(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [eventId, isPreview]);

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

  const totalPrice = useMemo(
    () => calculateSeatTotal(selected.values()),
    [selected]
  );

  const tierLegend = useMemo(() => {
    const tiers = new Map<string, { name: string; prices: number[] }>();
    for (const seat of seatMap?.seats ?? []) {
      const key = seat.tier.trim().toLowerCase();
      const existing = tiers.get(key) ?? { name: seat.tier, prices: [] };
      existing.prices.push(seat.price);
      tiers.set(key, existing);
    }

    return [...tiers.values()].sort((a, b) => {
      if (a.name.toLowerCase() === "standard") return -1;
      if (b.name.toLowerCase() === "standard") return 1;
      return a.name.localeCompare(b.name);
    });
  }, [seatMap]);

  const toggleSeat = (key: string) => {
    if (isPreview) return;
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

  /** Describes a seat for assistive technology. */
  const seatLabel = (seat: Seat, isSelected: boolean) => {
    const position = `Row ${seat.x}, seat ${seat.y}`;
    const price = `${seat.price.toFixed(2)}`;
    if (seat.status !== "available") return `${position}, ${seat.status}`;
    return `${position}, ${seat.tier}, ${price}${
      isSelected ? ", selected" : ""
    }`;
  };

  /** Arrow keys walk the grid; Home/End jump to the ends of a row. */
  const onGridKeyDown = (e: React.KeyboardEvent, x: number, y: number) => {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [x - 1, y],
      ArrowDown: [x + 1, y],
      ArrowLeft: [x, y - 1],
      ArrowRight: [x, y + 1],
      Home: [x, 1],
      End: [x, cols],
    };

    const move = moves[e.key];
    if (!move) return;

    const [nx, ny] = move;
    if (nx < 1 || nx > rows || ny < 1 || ny > cols) return;

    e.preventDefault();
    setFocused({ x: nx, y: ny });
    document.getElementById(`seat-${nx}-${ny}`)?.focus();
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
      const booking = await apiPost<BookingResponse>("/api/bookings", {
        eventId,
        seats,
      });

      toast.success("Seats held — complete your checkout!");
      navigate(`/checkout/${booking._id}`);
    } catch (e) {
      toast.error(errorMessage(e, "Failed to create booking"));
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
        <p className="text-lg font-semibold px-6 mb-4">
          {isPreview ? "Seat Map Preview" : "Your Selection"}
        </p>
        {!isPreview && (
          <div className="px-6 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span>Seats</span>
              <span className="tabular-nums">{selected.size}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total</span>
              <span className="tabular-nums">{totalPrice.toFixed(2)}</span>
            </div>
            {selected.size > 0 && (
              <div className="mt-3 space-y-1 border-t border-white/10 pt-3 text-xs">
                {[...selected.values()].map((seat) => (
                  <div
                    key={`${seat.x},${seat.y}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">
                      {seat.x}-{seat.y} · {seat.tier}
                    </span>
                    <span className="tabular-nums">{seat.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-6 mt-6 text-xs space-y-2">
          <p className="mb-2 font-medium text-gray-300">Available tiers</p>
          {tierLegend.map((tier) => {
            const prices = [...new Set(tier.prices)].sort((a, b) => a - b);
            const priceLabel =
              prices.length === 1
                ? prices[0].toFixed(2)
                : `${prices[0].toFixed(2)}–${prices.at(-1)!.toFixed(2)}`;
            return (
              <div key={tier.name} className="flex items-center gap-2">
                <span
                  className={`inline-block w-3 h-3 rounded border ${tierStyle(tier.name).dot}`}
                />
                <span className="min-w-0 flex-1 truncate">{tier.name}</span>
                <span className="tabular-nums text-gray-400">{priceLabel}</span>
              </div>
            );
          })}
          <div className="my-3 border-t border-white/10" />
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-yellow-500/50 border border-yellow-400/60" />
            <span>Reserved</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-rose-500/60 border border-rose-400/60" />
            <span>Sold</span>
          </div>
          {!isPreview && (
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded bg-primary/80 border border-primary/60" />
              <span>Selected</span>
            </div>
          )}
        </div>

        {/* Checkout Button (moved here for mobile) */}
        {!isPreview && <div className="px-6 mt-6 md:hidden">
          <button
            onClick={proceedToCheckout}
            disabled={isBooking || selected.size === 0} // Disable while booking or if none selected
            className="w-full flex items-center justify-center gap-2 px-5 py-2 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isBooking ? "Booking..." : "Proceed to checkout"}
          </button>
        </div>}
        {isPreview && (
          <div className="px-6 mt-6">
            <button
              type="button"
              onClick={() => navigate(`/organizer/events/${eventId}/manage`)}
              className="w-full rounded-md border border-white/10 px-3 py-2 text-sm hover:bg-white/10"
            >
              Back to event
            </button>
          </div>
        )}
      </div>

      {/* Right: grid */}
      <div className="relative flex-1 flex flex-col items-center max-md:mt-8">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />

        <h1 className="text-2xl font-semibold mb-2">
          {isPreview ? "Organizer Seat Preview" : "Select Your Seats"}
        </h1>
        <p className="text-gray-400 text-sm mb-6">SCREEN SIDE</p>

        {/* Announces selection changes, which are otherwise silent to a screen
            reader because the visible change is a colour. */}
        <p role="status" aria-live="polite" className="sr-only">
          {selected.size === 0
            ? "No seats selected"
            : `${selected.size} of ${MAX_SELECT} seats selected, total ${totalPrice.toFixed(
                2
              )}`}
        </p>

        {/* --- RESPONSIVENESS FIX --- */}
        {/* Wrap the grid in a horizontally scrollable container */}
        <div className="w-full overflow-x-auto pb-4 no-scrollbar">
          {/* Use min-w-max to allow grid to expand */}
          <div
            role="grid"
            aria-label="Seat map. Use the arrow keys to move between seats."
            className="flex flex-col items-center gap-2 min-w-max px-2"
          >
            {/* Grid seats */}
            {Array.from({ length: rows }, (_, ix) => {
              const x = ix + 1;
              return (
                <div key={x} role="row" aria-rowindex={x} className="flex gap-2">
                  {Array.from({ length: cols }, (_, iy) => {
                    const y = iy + 1;
                    const key = `${x},${y}`;
                    const seat = seatByKey.get(key);
                    if (!seat) {
                      // No seat at this position → spacer
                      return (
                        <span
                          key={key}
                          role="gridcell"
                          aria-hidden="true"
                          className="w-8 h-8"
                        />
                      );
                    }

                    const selectedHere = selected.has(key);
                    const base = `w-8 h-8 rounded border text-xs grid place-items-center transition ${
                      isPreview ? "cursor-default" : "cursor-pointer"
                    }`;
                    const styleByStatus: Record<
                      Exclude<Seat["status"], "available">,
                      string
                    > = {
                      reserved:
                        "border-yellow-400/60 bg-yellow-500/30 cursor-not-allowed",
                      sold: "border-rose-400/60 bg-rose-500/40 cursor-not-allowed",
                    };
                    const selectedStyle =
                      "bg-primary text-white border-primary";

                    const isFocusTarget = focused.x === x && focused.y === y;

                    return (
                      <button
                        key={key}
                        id={`seat-${x}-${y}`}
                        role="gridcell"
                        aria-colindex={y}
                        aria-label={seatLabel(seat, selectedHere)}
                        aria-pressed={selectedHere}
                        aria-disabled={seat.status !== "available"}
                        // Only the focused seat is tabbable; arrows do the rest.
                        tabIndex={isFocusTarget ? 0 : -1}
                        onFocus={() => setFocused({ x, y })}
                        onKeyDown={(e) => onGridKeyDown(e, x, y)}
                        onClick={() => toggleSeat(key)}
                        disabled={isPreview || seat.status !== "available"}
                        className={`${base} focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                          selectedHere
                            ? selectedStyle
                            : seat.status === "available"
                              ? tierStyle(seat.tier).seat
                              : styleByStatus[seat.status]
                        }`}
                        title={`${seat.tier} • ${seat.price.toFixed(2)}`}
                      >
                        <span aria-hidden="true">
                          {x}-{y}
                        </span>
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
        {!isPreview && <button
          onClick={proceedToCheckout}
          disabled={isBooking || selected.size === 0} // Disable while booking or if none selected
          className="hidden md:flex items-center gap-2 mt-10 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95 disabled:opacity-50"
        >
          {isBooking ? "Booking..." : "Proceed to checkout"}
        </button>}
      </div>
    </div>
  );
};

export default SeatMapPage;
