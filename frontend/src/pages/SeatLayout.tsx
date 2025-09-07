// src/pages/SeatLayout.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ArrowRightIcon, ClockIcon } from "lucide-react";
import BlurCircle from "../components/BlurCircle";
import toast from "react-hot-toast";

/* ----------------- Types ----------------- */
type TimeSlot = { time: string; showId: string };
type Show = {
  _id: string;
  title: string;
  dateTime: Record<string, TimeSlot[]>; // key = ISO date (midnight)
};

/* ----------------- Helpers ----------------- */
const isoMidnight = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
};

const buildDateSlots = (
  eventId: string,
  days = 7,
  times = ["18:00", "20:00", "22:00"]
): Record<string, TimeSlot[]> => {
  const out: Record<string, TimeSlot[]> = {};
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const dayISO = isoMidnight(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
    );
    out[dayISO] = times.map((t) => ({
      time: t,
      showId: `${eventId}_${dayISO}_${t}`,
    }));
  }
  return out;
};

// HH:mm -> h:mm A (e.g. "18:05" -> "6:05 PM")
const isoTimeFormat = (hhmm: string) => {
  const [HH, MM] = hhmm.split(":").map(Number);
  const h = ((HH + 11) % 12) + 1;
  const ampm = HH >= 12 ? "PM" : "AM";
  return `${h}:${String(MM).padStart(2, "0")} ${ampm}`;
};

// Mock occupied seats by showId suffix (so it's deterministic)
const mockOccupiedFor = (showId: string): string[] => {
  if (showId.endsWith("18:00")) return ["A1", "A2", "B3", "C5"];
  if (showId.endsWith("20:00")) return ["C6", "D4", "E7", "F1", "G3"];
  if (showId.endsWith("22:00")) return ["H2", "H3", "I5", "J9"];
  return [];
};

/* ----------------- Mock Data ----------------- */
const MOCK_SHOWS: Show[] = [
  {
    _id: "e1",
    title: "City Lights — Live DJ Night",
    dateTime: buildDateSlots("e1"),
  },
  {
    _id: "e2",
    title: "Open Air Festival — Day 1",
    dateTime: buildDateSlots("e2"),
  },
  {
    _id: "e3",
    title: "Indie Sessions — Acoustic",
    dateTime: buildDateSlots("e3"),
  },
  {
    _id: "e4",
    title: "Stand-Up Splash — Late Show",
    dateTime: buildDateSlots("e4"),
  },
  { _id: "e5", title: "Symphony Under Stars", dateTime: buildDateSlots("e5") },
];

/* ----------------- Component ----------------- */
const SeatLayout: React.FC = () => {
  const groupRows = useMemo(
    () => [
      ["A", "B"],
      ["C", "D"],
      ["E", "F"],
      ["G", "H"],
      ["I", "J"],
    ],
    []
  );
  const { id, date } = useParams<{ id: string; date: string }>();

  const [show, setShow] = useState<Show | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedTime, setSelectedTime] = useState<TimeSlot | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);

  // simulate fetch show by id
  useEffect(() => {
    const t = setTimeout(() => {
      const found = MOCK_SHOWS.find((s) => s._id === id) || null;
      setShow(found);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [id]);

  // when show + date param available, preselect first time of the day
  useEffect(() => {
    if (!show) return;
    if (!date || !show.dateTime[date]) return;
    setSelectedTime(show.dateTime[date][0] ?? null);
  }, [show, date]);

  // whenever timeslot changes, load occupied seats (mock)
  useEffect(() => {
    if (!selectedTime) return;
    const t = setTimeout(() => {
      setOccupiedSeats(mockOccupiedFor(selectedTime.showId));
    }, 150);
    return () => clearTimeout(t);
  }, [selectedTime]);

  const handleSeatClick = (seatId: string) => {
    if (!selectedTime) return toast.error("Please select a showtime first");
    if (!selectedSeats.includes(seatId) && selectedSeats.length >= 5)
      return toast.error("You can only select up to 5 seats");
    if (occupiedSeats.includes(seatId))
      return toast("This seat is already booked");

    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((s) => s !== seatId)
        : [...prev, seatId]
    );
  };

  const renderSeats = ({ row, count = 9 }: { row: string; count?: number }) => (
    <div className="flex gap-2 mt-2" key={row}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: count }, (_, i) => {
          const seatId = `${row}${i + 1}`;
          const isSelected = selectedSeats.includes(seatId);
          const isOccupied = occupiedSeats.includes(seatId);
          return (
            <button
              type="button"
              onClick={() => handleSeatClick(seatId)}
              key={seatId}
              aria-pressed={isSelected}
              aria-label={`Seat ${seatId}${isOccupied ? " (occupied)" : ""}`}
              className={`w-8 h-8 rounded border border-primary/60 cursor-pointer transition
                ${isSelected ? "bg-primary text-white" : "bg-transparent"}
                ${isOccupied ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {seatId}
            </button>
          );
        })}
      </div>
    </div>
  );

  const bookTickets = () => {
    if (!selectedTime || selectedSeats.length === 0)
      return toast.error("Please select a time and seats");
    toast.success(
      `Proceeding to checkout • ${
        selectedSeats.length
      } seat(s) for ${isoTimeFormat(selectedTime.time)}`
    );
    // Here you'd redirect to your payment/checkout page.
    // e.g., navigate(`/checkout?showId=${selectedTime.showId}&seats=${selectedSeats.join(",")}`)
  };

  if (loading) return <Loading />;

  if (!show) {
    return (
      <div className="px-6 lg:px-40 py-30 md:pt-50">
        <p className="text-gray-300">Event not found.</p>
      </div>
    );
  }

  const timesForDay = date ? show.dateTime[date] : undefined;

  return (
    <div className="flex flex-col md:flex-row px-6 lg:px-40 py-30 md:pt-50">
      {/* Available times */}
      <div className="w-60 bg-primary/10 border border-primary/20 rounded-lg py-10 h-max md:sticky md:top-30">
        <p className="text-lg font-semibold px-6">Available Timings</p>
        <div className="mt-2">
          {timesForDay && timesForDay.length > 0 ? (
            timesForDay.map((item) => (
              <button
                type="button"
                key={item.time}
                onClick={() => {
                  setSelectedTime(item);
                  setSelectedSeats([]);
                }}
                className={`flex items-center gap-2 px-6 py-2 w-max rounded-r-md cursor-pointer transition ${
                  selectedTime?.time === item.time
                    ? "bg-primary text-white"
                    : "hover:bg-primary/20 text-white"
                }`}
              >
                <ClockIcon className="w-4 h-4" />
                <span className="text-sm">{isoTimeFormat(item.time)}</span>
              </button>
            ))
          ) : (
            <p className="px-6 text-sm text-gray-400">
              No showtimes for this date.
            </p>
          )}
        </div>
      </div>

      {/* Seat layout */}
      <div className="relative flex-1 flex flex-col items-center max-md:mt-16">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="0" right="0" />
        <h1 className="text-2xl font-semibold mb-4">Select Your Seats</h1>

        {/* Screen bar (no assets) */}
        <div
          aria-hidden
          className="w-full max-w-[680px] h-6 rounded-t-2xl bg-gradient-to-b from-white/70 to-white/20"
        />
        <p className="text-gray-400 text-sm mb-6">SCREEN SIDE</p>

        {/* Seat grid */}
        <div className="flex flex-col items-center mt-10 text-xs text-gray-300">
          <div className="grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-2 mb-6">
            {groupRows[0].map((row) => renderSeats({ row }))}
          </div>
          <div className="grid grid-cols-2 gap-11">
            {groupRows.slice(1).map((group, index) => (
              <div key={index}>{group.map((row) => renderSeats({ row }))}</div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-4 text-xs text-gray-300">
          <span className="inline-flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded border border-primary/60" />{" "}
            Available
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded bg-primary" /> Selected
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded border border-primary/60 opacity-50" />{" "}
            Occupied
          </span>
        </div>

        <button
          onClick={bookTickets}
          className="flex items-center gap-1 mt-10 px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer active:scale-95"
        >
          proceed to checkout
          <ArrowRightIcon strokeWidth={3} className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SeatLayout;
