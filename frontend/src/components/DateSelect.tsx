import React, { useEffect, useMemo, useState } from "react";
import BlurCircle from "./BlurCircle";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

type DateSelectProps = {
  /** Event id (for navigation fallback) */
  eventId: string;
  /** One or more ISO datetimes; for now you’ll pass [event.startTime] */
  dates: string[];
  /** Optional: if provided, scroll to this element id on “Book Now” (default: "seatmap") */
  scrollTargetId?: string;
};

const DateSelect: React.FC<DateSelectProps> = ({
  eventId,
  dates,
  scrollTargetId = "seatmap",
}) => {
  const navigate = useNavigate();
  const normalizedDates = useMemo(
    () =>
      (dates || [])
        .map((iso) => new Date(iso))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime()),
    [dates]
  );

  const [selectedISO, setSelectedISO] = useState<string | null>(null);

  // Auto-select the only/fisrt available date
  useEffect(() => {
    if (normalizedDates.length > 0) {
      setSelectedISO(normalizedDates[0].toISOString());
    } else {
      setSelectedISO(null);
    }
  }, [normalizedDates]);

  const onBookNow = () => {
    if (!selectedISO) {
      return toast.error("Please select a date");
    }
    // Prefer smooth scroll if DateSelect is on the details page
    const el = document.getElementById(scrollTargetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Fallback: navigate with hash anchor (works even if used on another page)
      navigate(`/events/${eventId}/seatmap`);
    }
  };

  if (normalizedDates.length === 0) {
    return null; // nothing to select (shouldn’t happen with your current model)
  }

  return (
    <div id="dateSelect" className="pt-30">
      <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative bg-primary/10 p-8 border border-primary/20 rounded-lg">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle top="100px" right="0px" />

        <div className="w-full">
          <p className="text-lg font-semibold">Choose Date</p>
          <div className="flex items-center gap-6 text-sm mt-5">
            <ChevronLeftIcon width={28} className="opacity-50" />
            <span className="grid grid-cols-3 md:flex flex-wrap md:max-w-lg gap-4">
              {normalizedDates.map((d) => {
                const iso = d.toISOString();
                const isSelected = selectedISO === iso;
                return (
                  <button
                    key={iso}
                    className={`flex flex-col items-center justify-center h-14 w-14 aspect-square rounded cursor-pointer transition
                      ${
                        isSelected
                          ? "bg-primary text-white"
                          : "bg-transparent border border-primary/70 hover:border-primary"
                      }`}
                    onClick={() => setSelectedISO(iso)}
                    title={d.toLocaleString()}
                  >
                    <span className="tabular-nums">{d.getDate()}</span>
                    <span>
                      {d.toLocaleDateString([], {
                        month: "short",
                      })}
                    </span>
                  </button>
                );
              })}
            </span>
            <ChevronRightIcon width={28} className="opacity-50" />
          </div>
        </div>

        <button
          onClick={() => {
            onBookNow();
            scrollTo(0, 0);
          }}
          className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer"
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

export default DateSelect;
