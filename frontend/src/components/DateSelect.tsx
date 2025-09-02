// src/components/booking/DateSelect.tsx
import React, { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import BlurCircle from "./BlurCircle";

type DateSelectProps = {
  /** keys should be ISO date strings, values can be any time slots/metadata */
  dateTime: Record<string, unknown>;
  id: string;
};

const DateSelect: React.FC<DateSelectProps> = ({ dateTime, id }) => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const onBookNow = () => {
    if (!selected) {
      toast("Please select a date");
      return;
    }
    navigate(`/movies/${id}/${selected}`);
    scrollTo(0, 0);
  };

  return (
    <div id="dateSelect" className="pt-30">
      <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative bg-primary/10 p-8 border border-primary/20 rounded-lg">
        <BlurCircle top="-100px" left="-100px" />
        <BlurCircle top="100px" right="0px" />
        <div>
          <p className="text-lg font-semibold">Choose Date</p>
          <div className="flex items-center gap-6 text-sm mt-5">
            <ChevronLeftIcon width={28} />
            <span className="grid grid-cols-3 md:flex flex-wrap md:max-w-lg gap-4">
              {Object.keys(dateTime).map((date) => (
                <button
                  key={date}
                  className={`flex flex-col items-center justify-center h-14 w-14 aspect-square rounded cursor-pointer ${
                    selected === date
                      ? "bg-primary text-white"
                      : "bg-transparent border border-primary/70"
                  }`}
                  onClick={() => setSelected(date)}
                >
                  <span>{new Date(date).getDate()}</span>
                  <span>
                    {new Date(date).toLocaleDateString("en-US", {
                      month: "short",
                    })}
                  </span>
                </button>
              ))}
            </span>
            <ChevronRightIcon width={28} />
          </div>
        </div>
        <button
          onClick={onBookNow}
          className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer"
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

export default DateSelect;
