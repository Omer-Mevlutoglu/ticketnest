// src/pages/Events.tsx
import React from "react";
import BlurCircle from "../components/BlurCircle";
import EventCard from "../components/EventCard";

type Event = {
  _id: string;
  title: string;
  date: string; // ISO
  genre: string[];
  duration: string; // e.g., "2h 05m"
  rating: number; // 0–10
  poster?: string; // left empty intentionally
};

const MOCK_EVENTS: Event[] = [
  {
    _id: "e1",
    title: "City Lights — Live DJ Night",
    date: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString(),
    genre: ["EDM", "Club"],
    duration: "4h",
    rating: 8.3,
    poster: "",
  },
  {
    _id: "e2",
    title: "Open Air Festival — Day 1",
    date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    genre: ["Festival"],
    duration: "6h",
    rating: 8.8,
    poster: "",
  },
  {
    _id: "e3",
    title: "Indie Sessions — Acoustic",
    date: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    genre: ["Indie", "Acoustic"],
    duration: "2h",
    rating: 7.9,
    poster: "",
  },
  {
    _id: "e4",
    title: "Stand-Up Splash — Late Show",
    date: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
    genre: ["Comedy"],
    duration: "1h 45m",
    rating: 8.1,
    poster: "",
  },
  {
    _id: "e5",
    title: "Symphony Under Stars",
    date: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
    genre: ["Orchestra", "Outdoor"],
    duration: "2h 15m",
    rating: 8.6,
    poster: "",
  },
  {
    _id: "e6",
    title: "Crimson Alley — Night Show",
    date: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    genre: ["Live", "Alt"],
    duration: "1h 55m",
    rating: 7.6,
    poster: "",
  },
  {
    _id: "e7",
    title: "Paper Skies — Matinee",
    date: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
    genre: ["Theater", "Drama"],
    duration: "2h 05m",
    rating: 8.1,
    poster: "",
  },
  {
    _id: "e8",
    title: "Laugh Line — Comedy Night",
    date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    genre: ["Comedy"],
    duration: "1h 40m",
    rating: 7.2,
    poster: "",
  },
];

const Events: React.FC = () => {
  const events = MOCK_EVENTS;

  return events.length > 0 ? (
    <div className="relative my-40 mb-60 px-6 md:px-16 lg:px-24 xl:px-44 overflow-hidden min-h-[80vh]">
      <BlurCircle top="150px" left="0px" />
      <BlurCircle top="50px" right="50px" />
      <h1 className="text-lg font-medium my-4">All Events</h1>

      <div className="flex flex-wrap max-sm:justify-center gap-8">
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
