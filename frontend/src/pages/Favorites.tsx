import React from "react";
import { Link } from "react-router-dom";
import BlurCircle from "../components/BlurCircle";
import { CardGridSkeleton, EmptyState } from "../components/states/StateViews";
import EventCard from "../components/EventCard";
import { useFavorites } from "../hooks/useFavorites";

const Favorites: React.FC = () => {
  // One request: the server returns the ids and the event summaries together.
  const { events, loading } = useFavorites();

  if (loading) {
    return (
      <div className="px-6 md:px-16 lg:px-24 xl:px-44 mt-40">
        <CardGridSkeleton count={3} label="Loading favorites" />
      </div>
    );
  }

  return (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle top="50px" right="50px" />

      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium my-4">
          Favorite Events {events.length > 0 ? `(${events.length})` : ""}
        </h1>
        {events.length > 0 && (
          <Link
            to="/events"
            className="text-sm text-gray-300 hover:underline"
          >
            Find more →
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="You haven't favorited any events yet"
          description="Tap the star on an event to keep it here."
          action={{ label: "Browse events", to: "/events" }}
        />
      ) : (
        <div className="flex flex-wrap max-sm:justify-center gap-8">
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
