import BlurCircle from "../components/BlurCircle";
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

  // 🌀 1. Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-14 w-14 border-2 border-t-primary" />
      </div>
    );
  }

  // ⚠️ 2. Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
        <h2 className="text-xl font-semibold text-red-400 mb-2">
          Something went wrong 😞
        </h2>
        <p className="text-gray-400">{error}</p>
      </div>
    );
  }

  // 🎬 3. Normal / Empty states
  return events.length > 0 ? (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle top="50px" right="50px" />
      <h1 className="text-lg font-medium my-4">Now Showing</h1>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {/* 3. This page shows ALL events, not just a slice */}
        {events.map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>
    </div>
  ) : (
    <div className="px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden mt-40">
      <div className="featuredHead relative pt-20 pb-10 flex justify-center">
        <h1 className="font-bold text-3xl text-gray-300">No Events Found</h1>
      </div>
    </div>
  );
};

export default Events;
