import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { StarIcon, HeartIcon } from "lucide-react";
import { useEventDetails } from "../hooks/useEventDetails";
import useFeaturedEvents from "../hooks/useFeaturedEvents";
import BlurCircle from "../components/BlurCircle";
import DateSelect from "../components/DateSelect";
import EventCard from "../components/EventCard";
import Loading from "../components/Loading";
import { useFavorites } from "../hooks/useFavorites";

function formatDateRange(startISO?: string, endISO?: string) {
  if (!startISO || !endISO) return "";
  const s = new Date(startISO);
  const e = new Date(endISO);
  const sameDay = s.toDateString() === e.toDateString();
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (d: Date) =>
    d.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return sameDay
    ? `${fmtDate(s)} • ${fmtTime(s)}–${fmtTime(e)}`
    : `${fmtDate(s)} ${fmtTime(s)} → ${fmtDate(e)} ${fmtTime(e)}`;
}

const EventDetails: React.FC = () => {
  const { ids: favoriteIds, toggle } = useFavorites();

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { event, venue, loading, error } = useEventDetails(id);
  const isFav = !!(event && favoriteIds.includes(event._id));

  // Other events to recommend (exclude current)
  const { events: allEvents } = useFeaturedEvents();
  const recommendations = useMemo(
    () => allEvents.filter((e) => e._id !== id).slice(0, 4),
    [allEvents, id]
  );

  // Pick a hero image: event poster → venue first image → placeholder
  const heroImage = useMemo(() => {
    return event?.poster || venue?.images?.[0] || "/placeholder.jpg";
  }, [event?.poster, venue?.images]);

  // Gallery (venue images) for template venues; empty array if none
  const gallery = venue?.images ?? [];

  // Optional: selected gallery image for a “lightbox”-feel hero swap
  const [activeImg, setActiveImg] = useState<string | null>(null);
  useEffect(() => {
    setActiveImg(null); // reset on event change
  }, [id]);

  if (loading) {
    return (
      <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
        <Loading />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50 min-h-[70vh] grid place-items-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">
            Couldn’t load this event
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50 ">
      <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
        {/* Left: Hero image */}
        <img
          src={activeImg || heroImage}
          alt={event.title}
          className="max-md:mx-auto rounded-xl h-104 max-w-70 object-cover"
        />

        {/* Right: Details */}
        <div className="relative flex flex-col gap-3">
          <BlurCircle top="-100px" left="-100px" />
          <p className="text-primary capitalize">
            {event.categories?.[0] ?? "Event"}
          </p>

          <h1 className="text-4xl font-semibold max-w-96 text-balance">
            {event.title}
          </h1>

          <div className="flex items-center gap-2 text-gray-300">
            <StarIcon className="w-5 h-5 text-primary fill-primary" />
            Popular Event
          </div>

          <p className="text-gray-400 mt-2 text-sm leading-tight max-w-xl">
            {event.description}
          </p>

          <p className="text-gray-300">
            {formatDateRange(event.startTime, event.endTime)}
          </p>

          <p className="text-gray-400">
            {event.venueName}
            {event.venueAddress ? ` • ${event.venueAddress}` : ""}
          </p>

          <div className="flex gap-4 items-center mt-4">
            <a
              href="#dateSelectWrapper"
              className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition font-medium cursor-pointer rounded-md active:scale-95"
            >
              Buy Ticket
            </a>

            <button
              className="bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95"
              title={isFav ? "Remove from favorites" : "Add to favorites"}
              onClick={() => event && toggle(event._id)}
            >
              <HeartIcon
                className={`w-5 h-5 transition ${
                  isFav
                    ? "text-primary fill-primary"
                    : "text-gray-300 hover:text-primary"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
      {/* Gallery (venue images) */}
      {gallery.length > 0 && (
        <>
          <p className="mt-20 font-medium text-lg">Venue Gallery</p>
          <div className="overflow-x-auto no-scrollbar mt-6 pb-4">
            <div className="flex items-center gap-4 w-max">
              {gallery.slice(0, 12).map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  onClick={() => setActiveImg(img)}
                  className="relative"
                  title="Preview"
                >
                  <img
                    src={img}
                    alt={`Venue ${idx + 1}`}
                    className="h-24 w-40 rounded-lg object-cover opacity-90 hover:opacity-100 transition"
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Date selector (for now, single startTime; later you can pass more dates) */}
      <div className="max-w-6xl mx-auto mt-16" id="dateSelectWrapper">
        <DateSelect eventId={event._id} dates={[event.startTime]} />
      </div>

      {/* You may also like */}
      <p className="mt-20 text-lg font-medium mb-8">You may also like</p>
      {recommendations.length === 0 ? (
        <div className="featuredHead relative pt-20 pb-10 flex justify-center">
          <h1 className="font-bold text-3xl text-gray-300">
            No recommendations available
          </h1>
        </div>
      ) : (
        <div className="flex flex-wrap max-sm:justify-center gap-8">
          {recommendations.map((ev) => (
            <EventCard key={ev._id} event={ev} />
          ))}
        </div>
      )}

      <div className="flex justify-center mt-8 mb-20">
        <button
          onClick={() => {
            navigate("/events");
            scrollTo(0, 0);
          }}
          className="bg-primary text-white px-10 py-3 mt-6 rounded-md hover:bg-primary-dull font-medium transition-all cursor-pointer"
        >
          Show More
        </button>
      </div>
    </div>
  );
};

export default EventDetails;
