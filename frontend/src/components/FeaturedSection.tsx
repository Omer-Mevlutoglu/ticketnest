// src/components/FeaturedSection.tsx
import React, { useEffect, useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BlurCircle from "./BlurCircle";
import EventCard from "./EventCard";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

type ApiEvent = {
  _id: string;
  title: string;
  categories?: string[];
  startTime: string;
  endTime: string;
  venueName?: string;
  venueAddress?: string;
  poster?: string;
};

const FeaturedSection: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<ApiEvent[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/events`, {
          credentials: "include",
        });
        const data: ApiEvent[] = await res.json();
        setEvents(data);
      } catch {
        setEvents([]);
      }
    })();
  }, []);

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
