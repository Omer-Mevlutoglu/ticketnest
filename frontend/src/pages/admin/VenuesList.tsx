import React from "react";
import { useNavigate } from "react-router-dom";
import { PencilIcon, Trash2Icon, PlusIcon, ImageIcon } from "lucide-react";
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";
import { useVenues } from "./hooks/useVenues";

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
    <div className="relative px-6 md:px-10 lg:px-16 pt-8 pb-16">
      <BlurCircle top="0" right="-100px" />
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Venues</h1>
        <button
          onClick={() => nav("/admin/venue-create")}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dull transition px-4 py-2 rounded-md text-sm font-medium"
        >
          <PlusIcon className="w-4 h-4" /> Add Venue
        </button>
      </div>

      {venues.length === 0 ? (
        <p className="mt-10 text-gray-400">No venues found.</p>
      ) : (
        <div className="mt-6 grid gap-4">
          {venues.map((v) => (
            <div
              key={v._id}
              className="flex flex-col md:flex-row justify-between items-stretch gap-4 border border-white/10 bg-white/5 backdrop-blur rounded-lg p-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-16 w-24 rounded-md overflow-hidden bg-black/20 grid place-items-center">
                  {v.images?.length ? (
                    <img
                      src={v.images[0]}
                      alt={v.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 opacity-60" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{v.name}</p>
                  <p className="text-sm text-gray-400">{v.address}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Capacity: {v.capacity} • Layout: {v.defaultLayoutType}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:self-center">
                <button
                  onClick={() => nav(`/admin/venue-create?id=${v._id}`)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-white/15 hover:bg-white/10 transition"
                >
                  <PencilIcon className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => deleteVenue(v._id!)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-rose-400/30 text-rose-300 hover:bg-rose-500/10 transition"
                >
                  <Trash2Icon className="w-4 h-4" /> Delete
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
