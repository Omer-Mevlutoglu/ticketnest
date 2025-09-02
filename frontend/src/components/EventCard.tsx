// src/components/events/EventCard.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { StarIcon, Clock3Icon, Calendar1Icon } from "lucide-react";

type Event = {
  _id: string;
  title: string;
  date: string;
  genre: string[];
  duration: string;
  rating: number;
  poster?: string;
};

type EventCardProps = {
  event: Event;
};

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const navigate = useNavigate();

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

      <h3 className="event-title">{event.title}</h3>
      <p className="event-meta flex items-center gap-2 text-sm text-gray-400">
        <Calendar1Icon className="w-4 h-4" />
        {new Date(event.date).getFullYear()} |
        {event.genre.slice(0, 2).join(" | ")} |
        <Clock3Icon className="w-4 h-4" />
        {event.duration}
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
          {event.rating.toFixed(1)}
        </p>
      </div>
    </div>
  );
};

export default EventCard;
