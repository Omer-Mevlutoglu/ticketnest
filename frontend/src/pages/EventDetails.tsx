// src/pages/EventDetails.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BlurCircle from "../components/BlurCircle";
import { HeartIcon, PlayCircleIcon, StarIcon } from "lucide-react";
import DateSelect from "../components/DateSelect";
import EventCard from "../components/EventCard";
import Loading from "../components/Loading";

type Cast = { name: string; profile?: string };
type Event = {
  _id: string;
  title: string;
  overview: string;
  genres: string[];
  duration: string; // e.g., "2h 10m"
  rating: number; // 0-10
  releaseYear: number; // for display
  poster?: string;
  casts: Cast[];
};

const MOCK_EVENTS: Event[] = [
  {
    _id: "e1",
    title: "City Lights — Live DJ Night",
    overview:
      "Lose yourself in pulsing beats and neon vibes at an unforgettable DJ set under city lights.",
    genres: ["EDM", "Club"],
    duration: "4h",
    rating: 8.3,
    releaseYear: 2025,
    poster: "",
    casts: [
      { name: "DJ Nova" },
      { name: "Ayla Kareem" },
      { name: "MC Vortex" },
      { name: "Luna Gray" },
      { name: "Rex Miles" },
      { name: "Mira Chen" },
      { name: "Jax Porter" },
      { name: "Celine Vox" },
    ],
  },
  {
    _id: "e2",
    title: "Open Air Festival — Day 1",
    overview:
      "A full-day outdoor festival featuring multiple stages, food trucks, and surprise guests.",
    genres: ["Festival"],
    duration: "6h",
    rating: 8.8,
    releaseYear: 2025,
    poster: "",
    casts: [
      { name: "Fireline" },
      { name: "The Paper Planes" },
      { name: "Rhea Sun" },
      { name: "Echo Crew" },
    ],
  },
  {
    _id: "e3",
    title: "Indie Sessions — Acoustic",
    overview:
      "An intimate acoustic set featuring rising indie voices and stripped-back arrangements.",
    genres: ["Indie", "Acoustic"],
    duration: "2h",
    rating: 7.9,
    releaseYear: 2025,
    poster: "",
    casts: [
      { name: "Aria Bloom" },
      { name: "Sage Wilder" },
      { name: "Owen Hale" },
    ],
  },
  {
    _id: "e4",
    title: "Stand-Up Splash — Late Show",
    overview:
      "Fresh jokes, fast riffs, and late-night laughs with a rotating lineup of stand-up comics.",
    genres: ["Comedy"],
    duration: "1h 45m",
    rating: 8.1,
    releaseYear: 2025,
    poster: "",
    casts: [
      { name: "Maya Brooks" },
      { name: "Kamal Aziz" },
      { name: "Zoe Park" },
    ],
  },
  {
    _id: "e5",
    title: "Symphony Under Stars",
    overview:
      "Experience classical favorites under the open sky with a 60-piece orchestra.",
    genres: ["Orchestra", "Outdoor"],
    duration: "2h 15m",
    rating: 8.6,
    releaseYear: 2025,
    poster: "",
    casts: [
      { name: "Conductor: L. Marchetti" },
      { name: "First Violin: J. Ivanov" },
    ],
  },
];

/** Build a date map for the next 7 days; DateSelect only uses the keys */
function makeDateMap(days = 7): Record<string, true> {
  const out: Record<string, true> = {};
  const d = new Date();
  for (let i = 0; i < days; i++) {
    const x = new Date(d);
    x.setDate(x.getDate() + i);
    x.setHours(0, 0, 0, 0);
    out[x.toISOString()] = true;
  }
  return out;
}

const EventDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);

  // simulate fetch
  useEffect(() => {
    const t = setTimeout(() => {
      const found = MOCK_EVENTS.find((e) => e._id === id) || null;
      setEvent(found);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [id]);

  const dateTime = useMemo(() => makeDateMap(7), []);
  const related = useMemo(
    () => MOCK_EVENTS.filter((e) => e._id !== id).slice(0, 4),
    [id]
  );

  const handleFavorite = () => {
    if (!id) return;
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  if (loading) return <Loading />;

  if (!event) {
    return (
      <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
        <p className="text-gray-300">Event not found.</p>
      </div>
    );
  }

  const isFav = favorites.includes(event._id);

  return (
    <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
      <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto">
        <img
          src={event.poster || ""}
          alt={`${event.title} poster`}
          className="max-md:max-auto rounded-xl h-104 max-w-70 object-cover"
        />

        <div className="relative flex flex-col gap-3">
          <BlurCircle top="-100px" left="-100px" />
          <p className="text-primary">Live Event</p>
          <h1 className="text-4xl font-semibold max-w-96 text-balance">
            {event.title}
          </h1>

          <div className="flex items-center gap-2 text-gray-300">
            <StarIcon className="w-5 h-5 text-primary fill-primary" />
            {event.rating.toFixed(1)} User Rating
          </div>

          <p className="text-gray-400 mt-2 text-sm leading-tight max-w-xl">
            {event.overview}
          </p>

          <p>
            {event.duration} | {event.genres.join(", ")} | {event.releaseYear}
          </p>

          <div className="flex gap-4 items-center mt-4">
            <button className="flex item-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer active:scale-95">
              <PlayCircleIcon className="w-5 h-5" /> Watch Teaser
            </button>

            <a
              href="#dateSelect"
              className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition font-medium cursor-pointer rounded-md active:scale-95"
            >
              Buy Ticket
            </a>

            <button
              onClick={handleFavorite}
              className="bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95"
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              title={isFav ? "Remove from favorites" : "Add to favorites"}
            >
              <HeartIcon
                className={`w-5 h-5 transition ${
                  isFav
                    ? "fill-primary text-primary"
                    : "text-gray-300 hover:text-primary"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <p className="mt-20 font-medium text-lg">Featured Lineup</p>
      <div className="overflow-x-auto no-scrollbar mt-8 pb-4">
        <div className="flex items-center gap-4 w-max pb-4">
          {event.casts.slice(0, 10).map((cast, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-2 max-w-[100px]"
            >
              <img
                src={cast.profile || ""}
                alt={cast.name}
                className="h-20 md:h-20 aspect-square rounded-full object-cover"
              />
              <p className="text-sm text-gray-300">{cast.name}</p>
            </div>
          ))}
        </div>
      </div>

      <DateSelect dateTime={dateTime} id={event._id} />

      <p className="mt-20 text-lg font-medium mb-8">You may also like</p>
      <div className="flex flex-wrap max-sm:justify-center gap-8">
        {related.map((ev) => (
          <EventCard key={ev._id} event={ev} />
        ))}
      </div>

      <div className="flex justify-center mt-8">
        <button
          onClick={() => {
            navigate("/events");
            scrollTo(0, 0);
          }}
          className="bg-primary text-white px-10 py-3 mt-6 rounded-md hover:bg-primary-dull font-medium transition-all cursor-pointer"
        >
          Show More
        </button>
      </div>
    </div>
  );
};

export default EventDetails;
