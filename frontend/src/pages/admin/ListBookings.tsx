// src/pages/admin/ListBookings.tsx
import React, { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";

type Booking = {
  user: { name: string };
  event: { title: string; dateTime: string };
  bookedSeats: Record<string, string>; // e.g., { "A1": "A1", "A2": "A2" }
  amount: number;
};

const currency = "USD ";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const MOCK_BOOKINGS: Booking[] = [
  {
    user: { name: "Alice Johnson" },
    event: {
      title: "The Silent Horizon – Premiere",
      dateTime: new Date().toISOString(),
    },
    bookedSeats: { A1: "A1", A2: "A2", A3: "A3" },
    amount: 54,
  },
  {
    user: { name: "Marcus Lee" },
    event: {
      title: "Crimson Alley – Evening Show",
      dateTime: new Date(Date.now() + 7200000).toISOString(),
    },
    bookedSeats: { B5: "B5", B6: "B6" },
    amount: 30,
  },
];

const ListBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // simulate fetch
    const t = setTimeout(() => {
      setBookings(MOCK_BOOKINGS);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  return !loading ? (
    <>
      <Title text1="List" text2="Bookings" />
      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 font-medium pl-15">User Name</th>
              <th className="p-2 font-medium">Event</th>
              <th className="p-2 font-medium">Event Time</th>
              <th className="p-2 font-medium">Seats</th>
              <th className="p-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="text-sm font-light">
            {bookings.map((booking, index) => (
              <tr
                key={index}
                className="border-b border-primary/10 bg-primary/5 even:bg-primary/10"
              >
                <td className="p-2">{booking.user.name}</td>
                <td className="p-2">{booking.event.title}</td>
                <td className="p-2">
                  {formatDateTime(booking.event.dateTime)}
                </td>
                <td className="p-2">
                  {Object.keys(booking.bookedSeats)
                    .map((seat) => booking.bookedSeats[seat])
                    .join(", ")}
                </td>
                <td className="p-2">
                  {currency}
                  {booking.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default ListBookings;
