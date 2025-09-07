// src/components/EventCard.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { StarIcon, Clock3Icon, Calendar1Icon } from "lucide-react";

type EventCardProps = {
  event: {
    _id: string;
    title: string;
    poster?: string;

    // preferred keys
    date?: string; // ISO
    genres?: string[];

    // tolerated fallbacks (so you don't break existing data)
    genre?: string[]; // common variant
    release_date?: string; // movie-style
    releaseDate?: string;
    startsAt?: string; // "starting soon" style

    duration?: string; // e.g., "2h 05m"
    runtime?: number; // minutes, fallback if you had it
    rating?: number; // 0..10
  };
};

function minsToHhMm(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const navigate = useNavigate();

  // normalize fields
  const dateISO =
    event.date ||
    event.release_date ||
    event.releaseDate ||
    event.startsAt ||
    new Date().toISOString();

  const year = new Date(dateISO).getFullYear();
  const genres = event.genres ?? event.genre ?? [];
  const duration =
    event.duration ??
    (typeof event.runtime === "number" ? minsToHhMm(event.runtime) : undefined);
  const rating = typeof event.rating === "number" ? event.rating : 0;

  return (
    <div className="event-card flex flex-col justify-between p-3 bg-gray-800 rounded-2xl hover:translate-y-1 transition duration-300 w-66">
      <img
        src={event.poster || ""}
        alt={`${event.title} poster`}
        onClick={() => {
          navigate(`/events/${event._id}`);
          scrollTo(0, 0);
        }}
        className="event-poster rounded-lg h-52 w-full object-cover cursor-pointer"
      />

      <h3 className="event-title mt-2">{event.title}</h3>

      <p className="event-genre text-sm text-gray-300">
        <span className="inline-flex items-center gap-1 mr-2">
          <Calendar1Icon className="w-4 h-4" />
          {year}
        </span>
        {genres.slice(0, 2).join(" | ")}
        {duration ? (
          <>
            {" "}
            |{" "}
            <span className="inline-flex items-center gap-1">
              <Clock3Icon className="w-4 h-4" />
              {duration}
            </span>
          </>
        ) : null}
      </p>

      <div className="flex justify-between items-center mt-4 pb-3">
        <button
          onClick={() => {
            navigate(`/events/${event._id}`);
            scrollTo(0, 0);
          }}
          className="bg-primary text-white px-4 py-2 text-xs hover:bg-primary-dull transition font-medium rounded-full cursor-pointer"
        >
          Buy Ticket
        </button>

        <p className="flex items-center gap-1 text-sm text-gray-300 mt-1 pr-1">
          <StarIcon className="w-4 h-4 fill-primary text-primary" />
          {rating.toFixed(1)}
        </p>
      </div>
    </div>
  );
};

export default EventCard;
