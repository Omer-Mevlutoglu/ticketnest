import React from "react";
import BlurCircle from "../components/BlurCircle";
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
} from "../components/states/StateViews";
import EventCard from "../components/EventCard";
// 1. Import the new consolidated hook
import useEvents from "../hooks/useEvents";

/**
 * This page displays ALL published events.
 * It now uses the same `useEvents` hook as the home page
 * to avoid a redundant API call.
 */
const Events = () => {
  // 2. Use the new hook
  const { events, loading, error } = useEvents();

  const page = (children: React.ReactNode) => (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle top="50px" right="50px" />
      <h1 className="text-lg font-medium my-4">Now Showing</h1>
      {children}
    </div>
  );

  // Skeletons in the shape of the cards, so the layout does not jump when the
  // real content arrives.
  if (loading) return page(<CardGridSkeleton label="Loading events" />);

  if (error) {
    return page(
      <ErrorState
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (events.length === 0) {
    return page(
      <EmptyState
        title="No events yet"
        description="Nothing is on sale right now. Check back soon."
      />
    );
  }

  return page(
    <div className="flex flex-wrap max-sm:justify-center gap-8">
      {events.map((event) => (
        <EventCard key={event._id} event={event} />
      ))}
    </div>
  );
};

export default Events;
