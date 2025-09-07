// src/pages/MyBookings.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Loading from "../components/Loading";
import BlurCircle from "../components/BlurCircle";

/* ---------------- Types ---------------- */
type Booking = {
  isPaid: boolean;
  amount: number;
  paymentLink?: string;
  bookedSeats: string[];        // e.g. ["A1","A2"]
  dateTimeISO: string;          // show time
  event: {
    title: string;
    poster?: string;            // left empty intentionally
    durationMinutes: number;    // to format with TimeFormat
  };
};

/* -------------- Helpers --------------- */
const currency = "USD";

function timeFormat(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function dateFormat(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* -------------- Mock Data ------------- */
const MOCK_BOOKINGS: Booking[] = [
  {
    isPaid: false,
    amount: 54,
    paymentLink: "/checkout/session_abc123",
    bookedSeats: ["A1", "A2", "A3"],
    dateTimeISO: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    event: { title: "City Lights — Live DJ Night", poster: "", durationMinutes: 240 },
  },
  {
    isPaid: true,
    amount: 30,
    bookedSeats: ["B5", "B6"],
    dateTimeISO: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    event: { title: "Open Air Festival — Day 1", poster: "", durationMinutes: 360 },
  },
  {
    isPaid: true,
    amount: 42,
    bookedSeats: ["C2", "C3"],
    dateTimeISO: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    event: { title: "Stand-Up Splash — Late Show", poster: "", durationMinutes: 105 },
  },
];

/* -------------- Component ------------- */
const MyBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // simulate fetch
    const t = setTimeout(() => {
      setBookings(MOCK_BOOKINGS);
      setIsLoading(false);
    }, 350);
    return () => clearTimeout(t);
  }, []);

  if (isLoading) return <Loading />;

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">
      <BlurCircle top="100px" left="100px" />
      <div>
        <BlurCircle bottom="0px" left="600px" />
      </div>

      <h1 className="text-lg font-semibold mb-4">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="mt-8 text-gray-400">You don’t have any bookings yet.</div>
      ) : (
        bookings.map((booking, index) => (
          <div
            key={index}
            className="flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl"
          >
            <div className="flex flex-col md:flex-row">
              <img
                src={booking.event.poster || ""}
                alt={`${booking.event.title} poster`}
                className="md:max-w-45 aspect-video h-auto object-cover object-bottom rounded"
              />
              <div className="flex flex-col p-4">
                <p className="text-lg font-semibold">{booking.event.title}</p>
                <p className="text-sm text-gray-400">
                  {timeFormat(booking.event.durationMinutes)}
                </p>
                <p className="text-sm text-gray-400 mt-auto">
                  {dateFormat(booking.dateTimeISO)}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:items-end md:text-right justify-between p-4">
              <div className="flex items-center gap-4">
                <p className="text-2xl font-semibold mb-3">
                  {currency} {booking.amount}
                </p>
                {!booking.isPaid && booking.paymentLink && (
                  <Link
                    to={booking.paymentLink}
                    className="bg-primary px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-pointer hover:bg-primary-dull transition"
                  >
                    Pay now
                  </Link>
                )}
              </div>
              <div className="text-sm">
                <p>
                  <span className="text-gray-400">Total Tickets </span>
                  {booking.bookedSeats.length}
                </p>
                <p>
                  <span className="text-gray-400">Seat Number </span>
                  {booking.bookedSeats.join(", ")}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default MyBookings;
