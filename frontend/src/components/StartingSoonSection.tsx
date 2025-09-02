// src/components/StartingSoonSection.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock3Icon, MapPinIcon, StarIcon } from "lucide-react";
import BlurCircle from "./BlurCircle";

type SoonEvent = {
  _id: string;
  title: string;
  startsAt: string; // ISO time within ~2h
  venue: string;
  city: string;
  rating: number;
  poster?: string; // left empty intentionally
};

// --- helpers ---
const inXMinutesISO = (mins: number) =>
  new Date(Date.now() + mins * 60_000).toISOString();

const MOCK_SOON: SoonEvent[] = [
  {
    _id: "s1",
    title: "City Lights — Live DJ Set",
    startsAt: inXMinutesISO(25),
    venue: "Neon Hall",
    city: "Istanbul",
    rating: 8.4,
    poster: "",
  },
  {
    _id: "s2",
    title: "Open Air Festival — Gate A",
    startsAt: inXMinutesISO(45),
    venue: "Park Arena",
    city: "Ankara",
    rating: 8.8,
    poster: "",
  },
  {
    _id: "s3",
    title: "Stand-Up Splash — Late Show",
    startsAt: inXMinutesISO(70),
    venue: "The Laugh Room",
    city: "Izmir",
    rating: 8.1,
    poster: "",
  },
  {
    _id: "s4",
    title: "Indie Sessions — Acoustic",
    startsAt: inXMinutesISO(95),
    venue: "Paper Club",
    city: "Bursa",
    rating: 7.9,
    poster: "",
  },
  {
    _id: "s5",
    title: "Symphony Under Stars",
    startsAt: inXMinutesISO(110),
    venue: "Harbor Stage",
    city: "Antalya",
    rating: 8.6,
    poster: "",
  },
];

function formatCountdown(targetISO: string) {
  const diff = new Date(targetISO).getTime() - Date.now();
  const clamped = Math.max(0, diff);
  const hrs = Math.floor(clamped / 3_600_000);
  const mins = Math.floor((clamped % 3_600_000) / 60_000);
  const secs = Math.floor((clamped % 60_000) / 1000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

const StartingSoonSection: React.FC = () => {
  const navigate = useNavigate();
  const [nowTick, setNowTick] = useState(Date.now());

  // update countdowns every second
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Filter to next ~2 hours (keep it focused)
  const soonEvents = useMemo(() => {
    const twoHours = 2 * 60 * 60 * 1000;
    return MOCK_SOON.filter((e) => {
      const dt = new Date(e.startsAt).getTime();
      return dt > nowTick && dt - nowTick <= twoHours;
    });
  }, [nowTick]);

  return (
    <section className="px-6 md:px-16 lg:px-24 xl:px-44">
      <div className="relative pt-20 pb-6 flex items-center justify-between">
        <BlurCircle top="0" right="-80px" />
        <h2 className="font-medium text-lg text-gray-300">Starting Soon</h2>
        <button
          onClick={() => navigate("/events")}
          className="text-sm text-gray-300 hover:underline"
        >
          Browse all →
        </button>
      </div>

      {/* Horizontal snap rail */}
      <div className="relative -mx-6 md:mx-0">
        <div className="overflow-x-auto no-scrollbar px-6 md:px-0">
          <div className="flex gap-5 snap-x snap-mandatory">
            {soonEvents.map((ev) => (
              <div
                key={ev._id}
                className="snap-start shrink-0 w-72 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-3 hover:-translate-y-0.5 transition"
              >
                {/* poster (empty src by request) */}
                <div className="aspect-[16/9] rounded-lg bg-black/20 overflow-hidden">
                  <img
                    src={ev.poster || ""}
                    alt={`${ev.title} poster`}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="mt-3">
                  <h3 className="font-semibold line-clamp-2">{ev.title}</h3>
                  <div className="mt-2 text-xs text-gray-300 space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock3Icon className="h-4 w-4" />
                      <span className="tabular-nums">
                        {formatCountdown(ev.startsAt)} •{" "}
                        {new Date(ev.startsAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4" />
                      <span>
                        {ev.venue} · {ev.city}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarIcon className="h-4 w-4 text-primary fill-primary" />
                      <span>{ev.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => navigate("/events")}
                      className="px-4 py-2 text-xs bg-primary hover:bg-primary-dull transition font-medium rounded-full cursor-pointer"
                    >
                      Grab Last Tickets
                    </button>
                    <button
                      onClick={() => navigate("/events")}
                      className="text-xs text-gray-300 hover:underline"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {soonEvents.length === 0 && (
              <div className="text-sm text-gray-400 py-10">
                Nothing starting in the next two hours—check all events →
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StartingSoonSection;
