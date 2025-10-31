import React from "react";
import { useNavigate } from "react-router-dom";
import { PencilIcon, Trash2Icon, PlusIcon, ImageIcon } from "lucide-react";

import { useVenues } from "./hooks/useVenues";
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";

const VenuesList: React.FC = () => {
  const nav = useNavigate();
  const { venues, loading, error, deleteVenue } = useVenues();

  if (loading) return <Loading />;
  if (error)
    return (
      <div className="grid place-items-center text-center min-h-[70vh] text-red-400">
        {error}
      </div>
    );

  return (
    // Base padding px-2 py-4
    <div className="relative px-2 py-4 sm:px-6 md:px-10 lg:px-16 overflow-x-hidden">
      <BlurCircle top="0" right="-100px" />
      {/* Header stacks below sm */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-base xs:text-lg sm:text-xl font-semibold w-full sm:w-auto">
          Venues
        </h1>
        <button
          onClick={() => nav("/admin/venue-create")}
          // Base text-xs, padding py-1
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md bg-primary hover:bg-primary-dull transition text-[10px] sm:text-xs w-full sm:w-auto"
        >
          <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4" /> Add Venue
        </button>
      </div>

      {venues.length === 0 ? (
        <p className="mt-10 text-gray-400 text-sm sm:text-base">
          No venues found.
        </p>
      ) : (
        <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4">
          {venues.map((v) => (
            <div
              key={v._id}
              className="flex flex-col sm:flex-row justify-between items-stretch gap-3 sm:gap-4 border border-white/10 bg-white/5 backdrop-blur rounded-lg p-2 sm:p-4"
            >
              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <div className="h-14 w-20 sm:h-16 sm:w-24 rounded-md overflow-hidden bg-black/20 grid place-items-center flex-shrink-0">
                  {v.images?.length ? (
                    <img
                      // Use API_BASE if paths are relative
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      src={
                        v.images[0].startsWith("/")
                          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            `${(import.meta as any).env.VITE_API_BASE || ""}${
                              v.images[0]
                            }`
                          : v.images[0]
                      }
                      alt={v.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 opacity-60" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm sm:text-base truncate">
                    {v.name}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 truncate">
                    {v.address}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1 truncate">
                    Capacity: {v.capacity} • Layout: {v.defaultLayoutType}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end sm:justify-start gap-2 sm:self-center flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                <button
                  // *** UPDATED NAVIGATION ***
                  onClick={() => nav(`/admin/venue-edit/${v._id}`)}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-md border border-white/15 hover:bg-white/10 transition"
                >
                  <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  onClick={() => deleteVenue(v._id!)}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs rounded-md border border-rose-400/30 text-rose-300 hover:bg-rose-500/10 transition"
                >
                  <Trash2Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VenuesList;
