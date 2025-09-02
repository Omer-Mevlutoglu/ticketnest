// src/components/FeaturedSection.tsx
import React from "react";
import { ArrowRightIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BlurCircle from "./BlurCircle";
import EventCard from "./EventCard";

type Event = {
  _id: string;
  title: string;
  date: string; // ISO date
  genre: string[];
  duration: string; // e.g., "2h 8m"
  rating: number; // 0-10
  poster?: string; // left empty on purpose
};

const MOCK_EVENTS: Event[] = [
  {
    _id: "e1",
    title: "The Silent Horizon – Premiere",
    date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    genre: ["Concert", "Live"],
    duration: "2h 10m",
    rating: 8.4,
    poster: "",
  },
  {
    _id: "e2",
    title: "Crimson Alley – Night Show",
    date: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString(),
    genre: ["Festival", "EDM"],
    duration: "1h 55m",
    rating: 7.6,
    poster: "",
  },
  {
    _id: "e3",
    title: "Paper Skies – Matinee",
    date: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
    genre: ["Theater", "Drama"],
    duration: "2h 05m",
    rating: 8.1,
    poster: "",
  },
  {
    _id: "e4",
    title: "Laugh Line – Comedy Night",
    date: new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString(),
    genre: ["Comedy"],
    duration: "1h 40m",
    rating: 7.2,
    poster: "",
  },
  {
    _id: "e5",
    title: "Underwave – Live Session",
    date: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
    genre: ["Indie", "Live"],
    duration: "2h 00m",
    rating: 8.0,
    poster: "",
  },
];

const FeaturedSection: React.FC = () => {
  const navigate = useNavigate();

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

      <div className="flex flex-wrap gap-8 mt-8 max-sm:justify-center">
        {MOCK_EVENTS.slice(0, 4).map((event) => (
          <EventCard key={event._id} event={event} />
        ))}
      </div>

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
