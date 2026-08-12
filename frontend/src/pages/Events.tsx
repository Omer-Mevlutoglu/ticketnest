import React, { useEffect, useState } from "react";
import BlurCircle from "../components/BlurCircle";
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
} from "../components/states/StateViews";
import EventCard from "../components/EventCard";
// 1. Import the new consolidated hook
import { useEventsPage } from "../hooks/useEvents";

/**
 * This page displays ALL published events.
 * It now uses the same `useEvents` hook as the home page
 * to avoid a redundant API call.
 */
const Events = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const { events, total, page: loadedPage, pageCount, loading, error } =
    useEventsPage(currentPage);

  useEffect(() => {
    if (!loading && pageCount > 0 && currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, loading, pageCount]);

  const renderPage = (children: React.ReactNode) => (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle top="50px" right="50px" />
      <h1 className="text-lg font-medium my-4">Now Showing</h1>
      {children}
    </div>
  );

  // Skeletons in the shape of the cards, so the layout does not jump when the
  // real content arrives.
  if (loading) return renderPage(<CardGridSkeleton label="Loading events" />);

  if (error) {
    return renderPage(
      <ErrorState
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (events.length === 0) {
    return renderPage(
      <EmptyState
        title="No events yet"
        description="Nothing is on sale right now. Check back soon."
      />
    );
  }

  return renderPage(
    <>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {events.map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>

      <nav
        className="mt-12 flex flex-wrap items-center justify-center gap-4"
        aria-label="Events pagination"
      >
        <button
          type="button"
          onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
          disabled={loadedPage <= 1}
          className="rounded-md border border-white/15 px-4 py-2 text-sm transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <p className="text-sm text-gray-300" aria-live="polite">
          Page {loadedPage} of {pageCount} · {total} events
        </p>
        <button
          type="button"
          onClick={() =>
            setCurrentPage((value) => Math.min(pageCount, value + 1))
          }
          disabled={loadedPage >= pageCount}
          className="rounded-md border border-white/15 px-4 py-2 text-sm transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </>
  );
};

export default Events;
