import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar1Icon,
  Clock3Icon,
  MapPinIcon,
  ArrowRightIcon,
} from "lucide-react";

type ApiEvent = {
  _id: string;
  title: string;
  categories?: string[];
  startTime: string; 
  endTime: string; 
  venueName?: string;
  venueAddress?: string;
  poster?: string; 
};

type EventCardProps = { event: ApiEvent };

function hhmmRange(aISO: string, bISO: string) {
  const a = new Date(aISO);
  const b = new Date(bISO);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${a.toLocaleTimeString([], opts)} – ${b.toLocaleTimeString(
    [],
    opts
  )}`;
}

function durationLabel(aISO: string, bISO: string) {
  const a = new Date(aISO).getTime();
  const b = new Date(bISO).getTime();
  const mins = Math.max(0, Math.round((b - a) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function dateLabel(aISO: string) {
  const d = new Date(aISO);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "2-digit",
  };
  return d.toLocaleDateString(undefined, opts);
}

const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const navigate = useNavigate();

  const cats = event.categories ?? [];
  const when = dateLabel(event.startTime);
  const timeRange = hhmmRange(event.startTime, event.endTime);
  const dur = durationLabel(event.startTime, event.endTime);
  const location =
    event.venueName || event.venueAddress
      ? [event.venueName, event.venueAddress].filter(Boolean).join(" • ")
      : undefined;

  const go = () => {
    navigate(`/events/${event._id}`);
    scrollTo(0, 0);
  };

  return (
    <article
      data-testid="event-card"
      className="flex w-66 max-w-full min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 p-3 transition duration-300 hover:-translate-y-0.5"
    >
      {/* Poster or placeholder */}
      {event.poster ? (
        <img
          src={event.poster}
          alt={`${event.title} poster`}
          onClick={go}
          className="rounded-lg h-52 w-full object-cover cursor-pointer"
        />
      ) : (
        <button
          onClick={go}
          className="rounded-lg h-52 w-full bg-gradient-to-br from-zinc-800 to-zinc-700 grid place-items-center cursor-pointer"
          aria-label={`${event.title} details`}
        >
          <span className="text-xl font-semibold opacity-90">
            {event.title}
          </span>
        </button>
      )}

      <h3 className="mt-2 line-clamp-2 break-words font-semibold">
        {event.title}
      </h3>

      <div className="mt-1 min-w-0 space-y-1 text-sm text-gray-300">
        <p className="flex min-w-0 items-center gap-2">
          <Calendar1Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
          {when}
        </p>
        <p className="flex min-w-0 items-center gap-2">
          <Clock3Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
          {timeRange} • {dur}
        </p>
        {location && (
          <p className="flex min-w-0 items-start gap-2">
            <MapPinIcon
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span
              className="min-w-0 line-clamp-2 break-words"
              title={location}
            >
              {location}
            </span>
          </p>
        )}
        {cats.length > 0 && (
          <p className="line-clamp-2 break-words text-xs text-gray-400">
            {cats.slice(0, 2).join(" • ")}
            {cats.length > 2 ? ` • +${cats.length - 2}` : ""}
          </p>
        )}
      </div>

      <div className="flex justify-between items-center mt-4 pb-2">
        <button
          type="button"
          onClick={go}
          className="bg-primary text-white px-4 py-2 text-xs hover:bg-primary-dull transition font-medium rounded-full inline-flex items-center gap-2"
        >
          Buy Ticket
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
};

export default EventCard;
