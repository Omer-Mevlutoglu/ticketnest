// src/pages/admin/ListEvents.tsx
import React, { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";

type EventRow = {
  title: string;
  dateTime: string; // ISO
  occupiedSeats: Record<string, true>;
  price: number;
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

const MOCK_EVENTS: EventRow[] = [
  {
    title: "The Silent Horizon – Premiere",
    dateTime: new Date(Date.now() + 86400000).toISOString(),
    occupiedSeats: { A1: true, A2: true, B3: true, C7: true },
    price: 18,
  },
  {
    title: "Crimson Alley – Evening Show",
    dateTime: new Date(Date.now() + 2 * 86400000).toISOString(),
    occupiedSeats: { D1: true, D2: true, D3: true, E4: true, E5: true },
    price: 15,
  },
];

const ListEvents: React.FC = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // simulate fetch
    const t = setTimeout(() => {
      setEvents(MOCK_EVENTS);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  return !loading ? (
    <>
      <Title text1="List" text2="Events" />

      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 font-medium pl-15">Event</th>
              <th className="p-2 font-medium">Event Time</th>
              <th className="p-2 font-medium">Total Bookings</th>
              <th className="p-2 font-medium">Earnings</th>
            </tr>
          </thead>
          <tbody className="text-sm font-light">
            {events.map((ev, index) => {
              const totalBookings = Object.keys(ev.occupiedSeats).length;
              const earnings = ev.price * totalBookings;
              return (
                <tr key={index} className="border-b border-primary/10 bg-primary/5 even:bg-primary/10">
                  <td className="p-2">{ev.title}</td>
                  <td className="p-2">{formatDateTime(ev.dateTime)}</td>
                  <td className="p-2">{totalBookings}</td>
                  <td className="p-2">
                    {currency}
                    {earnings}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default ListEvents;
