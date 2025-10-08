import { useState, useMemo } from "react";
import BlurCircle from "./BlurCircle";
import { PlayCircleIcon } from "lucide-react";
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

  if (loading) {
    return (
      <div className="px-6 md:px-16 lg:px-16 xl:px-44 mt-20 py-20">
        <p className="font-medium text-lg text-gray-300 mb-8">Upcoming</p>
        <div className="h-[540px] w-full max-w-[960px] mx-auto rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 md:px-16 lg:px-16 xl:px-44 mt-20 py-20 text-center text-red-400">
        Failed to load upcoming events.
      </div>
    );
  }

  if (visualEvents.length === 0) {
    return (
      <div className="px-6 md:px-16 lg:px-16 xl:px-44 mt-20 py-20 text-center text-gray-400">
        No upcoming events found yet.
      </div>
    );
  }

  return (
    <div className="px-6 md:px-16 lg:px-16 xl:px-44 mt-20 py-20 overflow-hidden">
      <p className="font-medium text-lg text-gray-300 max-w-[960px] mx-auto">
        Upcoming
      </p>

      {/* Main image */}
      <div className="relative mt-6">
        <BlurCircle top="-100px" right="-100px" />
        <img
          src={
            (current?.venueImages && current.venueImages[0]) ||
            current?.poster ||
            "/cel.jpg"
          }
          alt={current?.title}
          className="mx-auto max-w-full rounded-xl object-cover w-[960px] h-[540px] brightness-90"
        />
      </div>

      {/* Thumbnail selector */}
      <div className="group grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8 mt-8 max-w-3xl mx-auto">
        {visualEvents.map((ev) => {
          const img =
            (ev.venueImages && ev.venueImages[0]) || ev.poster || "/cel.jpg";
          const isActive = ev._id === current?._id;
          return (
            <div
              key={ev._id}
              className={`relative cursor-pointer rounded-lg overflow-hidden transition duration-300 ${
                isActive
                  ? "ring-2 ring-primary"
                  : "opacity-80 hover:opacity-100"
              }`}
              onClick={() => setCurrent(ev)}
            >
              <img
                src={img}
                alt={ev.title}
                className="w-full h-full object-cover brightness-75"
              />
              <PlayCircleIcon
                strokeWidth={1.6}
                className="absolute top-1/2 left-1/2 w-8 h-8 md:w-12 md:h-12 transform -translate-x-1/2 -translate-y-1/2 text-white"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingSection;
