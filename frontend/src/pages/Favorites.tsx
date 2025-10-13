import React from "react";
import { Link } from "react-router-dom";
import BlurCircle from "../components/BlurCircle";
import Loading from "../components/Loading";
import EventCard from "../components/EventCard";
import { useFavorites } from "../hooks/useFavorites";
import { useFavoriteEvents } from "../hooks/useFavoriteEvents";

const Favorites: React.FC = () => {
  // 1) fetch favorite IDs for the logged-in attendee
  const { ids, loading: favLoading } = useFavorites();

  // 2) fetch the corresponding event docs
  const { events, loading: evLoading, error } = useFavoriteEvents(ids);

  const loading = favLoading || evLoading;

  if (loading) {
    return (
      <div className="px-6 md:px-16 lg:px-24 xl:px-44 mt-40">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 md:px-16 lg:px-24 xl:px-44 mt-40 min-h-[60vh] grid place-items-center text-center">
        <p className="text-red-400">{error}</p>
        <Link
          to="/events"
          className="mt-4 inline-block bg-primary px-6 py-2 rounded-md hover:bg-primary-dull transition"
        >
          Browse events
        </Link>
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
        <div className="featuredHead relative pt-20 pb-10 flex flex-col items-center gap-3">
          <h2 className="font-bold text-2xl text-gray-300">
            You haven’t favorited any events yet
          </h2>
          <Link
            to="/events"
            className="px-6 py-2 text-sm bg-primary hover:bg-primary-dull transition font-medium cursor-pointer rounded-md"
          >
            Browse events
          </Link>
        </div>
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
