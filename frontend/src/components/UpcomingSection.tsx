import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BlurCircle from "./BlurCircle";
import useUpcomingEvents from "../hooks/useUpcomingEvents";

type EventWithImage = {
  _id: string;
  title: string;
  venueName?: string;
  venueAddress?: string;
  venueImages?: string[];
  poster?: string;
  startTime: string;
};

const UpcomingSection: React.FC = () => {
  const { events, loading, error } = useUpcomingEvents();
  const navigate = useNavigate();

  const visualEvents: EventWithImage[] = useMemo(
    () =>
      events
        .filter(
          (e) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Array.isArray((e as any).venueImages) ||
            typeof e.poster === "string"
        )
        .slice(0, 4), // show only 4
    [events]
  );

  const [current, setCurrent] = useState<EventWithImage | null>(
    visualEvents[0] || null
  );

  useMemo(() => {
    if (visualEvents.length > 0 && !current) {
      setCurrent(visualEvents[0]);
    }
  }, [visualEvents, current]);

  const currentIndex = useMemo(() => {
    if (!current) return -1;
    return visualEvents.findIndex((e) => e._id === current._id);
  }, [current, visualEvents]);

  const goPrev = useCallback(() => {
    if (visualEvents.length === 0) return;
    const idx = currentIndex <= 0 ? visualEvents.length - 1 : currentIndex - 1;
    setCurrent(visualEvents[idx]);
  }, [currentIndex, visualEvents]);

  const goNext = useCallback(() => {
    if (visualEvents.length === 0) return;
    const idx = currentIndex >= visualEvents.length - 1 ? 0 : currentIndex + 1;
    setCurrent(visualEvents[idx]);
  }, [currentIndex, visualEvents]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const goToDetails = () => {
    if (!current) return;
    navigate(`/events/${current._id}`);
    // ensure top on details page
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="px-6 md:px-16 xl:px-44 mt-20 py-20">
        <p className="font-medium text-lg text-gray-300 mb-8">Upcoming</p>
        <div className="h-[540px] w-full max-w-[960px] mx-auto rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 md:px-16 xl:px-44 mt-20 py-20 text-center text-red-400">
        Failed to load upcoming events.
      </div>
    );
  }

  if (visualEvents.length === 0) {
    return (
      <div className="px-6 md:px-16 xl:px-44 mt-20 py-20 text-center text-gray-400">
        No upcoming events found yet.
      </div>
    );
  }

  const heroSrc =
    (current?.venueImages && current.venueImages[0]) ||
    current?.poster ||
    "/cel.jpg";

  return (
    <div className="px-6 md:px-16 xl:px-44 mt-20 py-20 overflow-hidden">
      <p className="font-medium text-lg text-gray-300 max-w-[960px] mx-auto">
        Upcoming
      </p>

      {/* Main image + prev/next controls */}
      <div className="relative mt-6 max-w-[960px] mx-auto">
        <BlurCircle top="-100px" right="-100px" />
        <img
          src={heroSrc}
          alt={current?.title}
          className="mx-auto max-w-full rounded-xl object-cover w-[960px] h-[540px] brightness-90"
        />

        {/* Prev/Next buttons (only switch current, no navigation) */}
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous event"
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full px-3 py-2 backdrop-blur"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={goNext}
          aria-label="Next event"
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full px-3 py-2 backdrop-blur"
        >
          ›
        </button>

        {/* Details CTA (separate explicit navigation) */}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={goToDetails}
            className="px-4 py-2.5 rounded-lg bg-white text-black font-medium hover:bg-white/90 transition"
          >
            View details
          </button>
        </div>
      </div>

      {/* Thumbnail selector (click only changes current; no navigation) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8 mt-8 max-w-3xl mx-auto">
        {visualEvents.map((ev) => {
          const img =
            (ev.venueImages && ev.venueImages[0]) || ev.poster || "/cel.jpg";
          const isActive = ev._id === current?._id;

          return (
            <div
              key={ev._id}
              className={`cursor-pointer rounded-lg overflow-hidden transition duration-300 ${
                isActive
                  ? "ring-2 ring-primary"
                  : "opacity-80 hover:opacity-100"
              }`}
              onClick={() => setCurrent(ev)}
            >
              <img
                src={img}
                alt={ev.title}
                className="w-full h-36 object-cover rounded-md"
              />
              <div className="mt-2 text-center">
                <h4 className="text-white text-sm font-medium line-clamp-1">
                  {ev.title}
                </h4>
                <p className="text-gray-400 text-xs">
                  {formatDate(ev.startTime)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingSection;
