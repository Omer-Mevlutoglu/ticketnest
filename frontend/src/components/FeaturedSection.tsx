import { ArrowRightIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BlurCircle from "./BlurCircle";
import EventCard from "./EventCard";
// 1. Import the new consolidated hook
import useEvents from "../hooks/useEvents";

const FeaturedSection: React.FC = () => {
  const navigate = useNavigate();
  // 2. Use the new hook
  const { events, loading, error } = useEvents();

  return (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden">
      <div className="featuredHead relative pt-20 pb-10 flex justify-between">
        <BlurCircle top="0" right="-80px" />
        <p className="font-medium text-lg text-gray-300">Featured Events</p>
        <button
          onClick={() => navigate("/events")}
          className="group flex items-center gap-2 text-sm text-gray-300 cursor-pointer"
        >
          View All <ArrowRightIcon className="w-4.5 h-4" />
        </button>
      </div>

      {/* === LOADING STATE === */}
      {loading && (
        <div className="flex flex-wrap gap-8 mt-8 max-sm:justify-center">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-56 w-64 rounded-lg bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* === ERROR STATE === */}
      {!loading && error && (
        <div className="mt-10 text-center text-sm text-red-400">
          Failed to load events. Please try again later.
        </div>
      )}

      {/* === SUCCESS STATE === */}
      {!loading && !error && events.length > 0 && (
        <div className="flex flex-wrap gap-8 mt-8 max-sm:justify-center">
          {/* 3. The component still handles its own filtering (slice) */}
          {events.slice(0, 4).map((e) => (
            <EventCard
              key={e._id}
              event={{
                _id: e._id,
                title: e.title,
                categories: e.categories,
                startTime: e.startTime,
                endTime: e.endTime,
                venueName: e.venueName,
                venueAddress: e.venueAddress,
                poster: e.poster,
              }}
            />
          ))}
        </div>
      )}

      {/* === EMPTY STATE === */}
      {!loading && !error && events.length === 0 && (
        <div className="mt-10 text-center text-gray-400 text-sm">
          No events found right now. Check back soon!
        </div>
      )}

      <div className="flex justify-center items-center mt-20">
        <button
          onClick={() => {
            navigate("/events");
            scrollTo(0, 0);
          }}
          className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition font-medium cursor-pointer rounded-md"
        >
          Load More
        </button>
      </div>
    </div>
  );
};

export default FeaturedSection;
