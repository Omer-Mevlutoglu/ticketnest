import React from "react";
import BlurCircle from "./BlurCircle";
import { Calendar, Clock, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";

type EventTimeWidgetProps = {
  /** Event id (for navigation fallback) */
  eventId: string;
  /** The event's start time ISO string */
  startTime: string;
  /** The event's end time ISO string */
  endTime: string;
  /** Optional: if provided, scroll to this element id on “Book Now” (default: "seatmap") */
  scrollTargetId?: string;
};

/**
 * Formats an ISO string into a "Day, Month Date" (e.g., "Sat, Oct 28")
 */
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats two ISO strings into a "8:00 PM – 10:30 PM" range
 */
function formatTimeRange(isoA: string, isoB: string) {
  const a = new Date(isoA);
  const b = new Date(isoB);
  const opts: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${a.toLocaleTimeString([], opts)} – ${b.toLocaleTimeString(
    [],
    opts
  )}`;
}

/**
 * This component replaces the multi-date DateSelect.
 * It clearly displays the single event time and provides the "Book Now"
 * call-to-action that scrolls the user to the seatmap.
 */
const EventTimeWidget: React.FC<EventTimeWidgetProps> = ({
  eventId,
  startTime,
  endTime,
  scrollTargetId = "seatmap",
}) => {
  const navigate = useNavigate();

  // Return null if dates are invalid (shouldn't happen, but good guard)
  if (!startTime || !endTime) {
    return null;
  }

  const dateStr = formatDate(startTime);
  const timeStr = formatTimeRange(startTime, endTime);

  const onBookNow = () => {
    // Prefer smooth scroll if widget is on the details page
    const el = document.getElementById(scrollTargetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Fallback: navigate directly to the seatmap page
      navigate(`/events/${eventId}/seatmap`);
    }
  };

  return (
    <div id="dateSelect" className="pt-20 md:pt-30">
      <div className="relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 bg-zinc-900/80 p-6 md:p-8 border border-white/10 rounded-lg">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle bottom="-100px" right="-100px" />

        {/* Left Side: Date & Time */}
        <div className="flex-1 w-full flex flex-row md:flex-col gap-4 md:gap-2">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-gray-300">Date</p>
              <p className="text-base font-medium">{dateStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-gray-300">Time</p>
              <p className="text-base font-medium">{timeStr}</p>
            </div>
          </div>
        </div>

        {/* Right Side: Button */}
        <div className="w-full md:w-auto">
          <button
            onClick={() => {
              onBookNow();
              scrollTo(0, 0);
            }}
            className="w-full md:w-auto bg-primary text-white px-8 py-3 rounded-md hover:bg-primary-dull transition-all cursor-pointer inline-flex items-center justify-center gap-2 font-medium"
          >
            <Ticket className="w-5 h-5" />
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventTimeWidget;
