// src/pages/admin/ListEvents.tsx
import React, { useEffect, useState } from "react";
import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";
import { AdminAPI } from "../../lib/api";

// const currency = "USD ";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });

type AdminEvent = Awaited<ReturnType<typeof AdminAPI.listEvents>>[number];

const ListEvents: React.FC = () => {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await AdminAPI.listEvents();
        setEvents(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return !loading ? (
    <>
      <Title text1="List" text2="Events" />
      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 font-medium pl-15">Event</th>
              <th className="p-2 font-medium">Status</th>
              <th className="p-2 font-medium">Start</th>
              <th className="p-2 font-medium">End</th>
              <th className="p-2 font-medium">Venue</th>
            </tr>
          </thead>
          <tbody className="text-sm font-light">
            {events.map((ev) => (
              <tr key={ev._id} className="border-b border-primary/10 bg-primary/5 even:bg-primary/10">
                <td className="p-2">{ev.title}</td>
                <td className="p-2 capitalize">{ev.status}</td>
                <td className="p-2">{fmt(ev.startTime)}</td>
                <td className="p-2">{fmt(ev.endTime)}</td>
                <td className="p-2">
                  {ev.venueType === "template" ? ev.venueName : ev.venueName || "Custom"}
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

export default ListEvents;
