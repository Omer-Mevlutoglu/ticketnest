/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Import useNavigate

import toast from "react-hot-toast";
import {
  CalendarIcon,
  RocketIcon,
  ShieldOffIcon,
  Loader2Icon,
} from "lucide-react"; // Import Loader2Icon
import { useMyEvent } from "./hooks/useMyEvent"; // --- FIX: Removed unused 'SeatMapDoc' import ---
import SingleImageUploader from "../../components/organizer/SingleImageUploader"; // Adjust path as needed
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

// --- NEW Seat Map Generator Component ---
// We move the grid generation logic into its own component
// to avoid cluttering ManageEventPage
const GridGenerator: React.FC<{
  eventId: string;
  isBusy: boolean;
  setBusy: (busy: boolean) => void;
  onGenerated: () => void; // Callback to refetch
}> = ({ eventId, isBusy, setBusy, onGenerated }) => {
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(12);
  const [tier, setTier] = useState("Standard");
  const [price, setPrice] = useState(50);

  const generate = async () => {
    if (isBusy || !eventId) return;
    setBusy(true);
    try {
      const spec = {
        rows,
        cols,
        default: { tier, price },
      };
      const res = await fetch(
        `${API_BASE}/api/events/${eventId}/seatmap/generate`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(spec),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success("Seat map (re)generated!");
      onGenerated(); // This will call refetch()
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate seat map");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <div>
        <label className="text-xs text-gray-400 block mb-1">Rows</label>
        <input
          type="number"
          min={1}
          value={rows}
          onChange={(e) => setRows(Number(e.target.value))}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 outline-none text-sm"
          disabled={isBusy}
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Cols</label>
        <input
          type="number"
          min={1}
          value={cols}
          onChange={(e) => setCols(Number(e.target.value))}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 outline-none text-sm"
          disabled={isBusy}
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">Default Tier</label>
        <input
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 outline-none text-sm"
          disabled={isBusy}
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 block mb-1">
          Default Price
        </label>
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 outline-none text-sm"
          disabled={isBusy}
        />
      </div>
      <div className="flex items-end">
        <button
          type="button"
          onClick={generate}
          disabled={isBusy}
          className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-md border border-white/10 hover:bg-white/10 transition disabled:opacity-50"
        >
          {isBusy ? (
            <Loader2Icon className="w-4 h-4 mx-auto animate-spin" />
          ) : (
            "Generate"
          )}
        </button>
      </div>
    </div>
  );
};

const ManageEventPage: React.FC = () => {
  const { id } = useParams();
  const { event, seatSummary, loading, error, refetch } = useMyEvent(id);
  const navigate = useNavigate(); // Added navigate

  // local form state mirrors event
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [categoriesInput, setCategoriesInput] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [poster, setPoster] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");

  // Saving/Busy state
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isGenBusy, setIsGenBusy] = useState(false); // For grid generator

  // seed form when event changes
  React.useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setDesc(event.description);
    setCategoriesInput(event.categories?.join(", ") || "");
    // Helper to format ISO to YYYY-MM-DDTHH:mm
    const formatForInput = (iso: string | undefined) =>
      iso ? iso.slice(0, 16) : "";
    setStartTime(formatForInput(event.startTime));
    setEndTime(formatForInput(event.endTime));
    setPoster(event.poster || "");
    setVenueName(event.venueName || "");
    setVenueAddress(event.venueAddress || "");
  }, [event]);

  const categories = useMemo(
    () =>
      categoriesInput
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    [categoriesInput]
  );

  async function saveBasics(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!id || isSaving) return;

    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      return toast.error("End time must be after start time.");
    }

    setIsSaving(true);
    try {
      const payload: any = {
        title,
        description: desc,
        categories,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        poster: poster || undefined,
      };

      if (event?.venueType === "custom") {
        payload.venueName = venueName;
        payload.venueAddress = venueAddress;
      }

      const res = await fetch(`${API_BASE}/api/events/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Event updated");
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function publishEvent() {
    if (!id || isPublishing) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/events/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Published!");
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Failed to publish. (Is a seat map set?)");
    } finally {
      setIsPublishing(false);
    }
  }

  // Removed old generateGrid, it's in the component now

  if (loading) return <Loading />;
  if (error || !event) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-center p-4">
        <p className="text-red-400">{error || "Event not found"}</p>
        <button
          onClick={() => navigate("/organizer/myevents")}
          className="mt-4 px-4 py-2 rounded bg-primary hover:bg-primary-dull transition"
        >
          Back to Events
        </button>
      </div>
    );
  }

  // const canEditVenueBasics = event.venueType === "custom"; // This was the other unused var
  const hasSeatMap = !!event.seatMapId;
  const isBusy = isSaving || isPublishing || isGenBusy;

  return (
    <div className="relative p-2 py-4 sm:px-6 md:px-8 overflow-x-hidden">
      <BlurCircle top="-60px" left="-80px" />
      <BlurCircle bottom="-40px" right="-60px" />

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0 flex-1 w-full sm:w-auto">
          <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold break-words">
            Manage Event
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 truncate mt-1">
            ID: {event._id}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          <span
            className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full border ${
              event.status === "published"
                ? "border-emerald-400 text-emerald-300"
                : event.status === "draft"
                ? "border-yellow-400 text-yellow-300"
                : "border-gray-400 text-gray-300"
            }`}
          >
            {event.status}
          </span>

          {event.status !== "published" && (
            <button
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md bg-primary hover:bg-primary-dull transition text-xs sm:text-sm disabled:opacity-50"
              onClick={publishEvent}
              title={
                !hasSeatMap
                  ? "A seat map must be set before publishing"
                  : "Publish"
              }
              disabled={isBusy || !hasSeatMap}
            >
              {isPublishing ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : (
                <RocketIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              {isPublishing ? "Publishing..." : "Publish"}
            </button>
          )}
        </div>
      </div>

      {/* EDIT FORM */}
      <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Basics */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <form
            onSubmit={saveBasics}
            className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4"
          >
            <p className="text-sm font-medium mb-3">Basics</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Title
                </label>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isBusy}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Categories (comma separated)
                </label>
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                  value={categoriesInput}
                  onChange={(e) => setCategoriesInput(e.target.value)}
                  disabled={isBusy}
                />
              </div>
            </div>

            <div className="mt-3 sm:mt-4">
              <label className="text-xs text-gray-400 block mb-1">
                Description
              </label>
              <textarea
                className="w-full min-h-[90px] sm:min-h-[110px] rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                required
                disabled={isBusy}
              />
            </div>

            <div className="mt-3 sm:mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Start
                </label>
                <div className="relative flex items-center">
                  <CalendarIcon className="w-4 h-4 opacity-75 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border border-white/10 bg-white/5 pl-8 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base appearance-none"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    disabled={isBusy}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">End</label>
                <div className="relative flex items-center">
                  <CalendarIcon className="w-4 h-4 opacity-75 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border border-white/10 bg-white/5 pl-8 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base appearance-none"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    disabled={isBusy}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 sm:mt-4">
              <SingleImageUploader
                label="Poster"
                value={poster}
                onChange={setPoster}
                endpoint="/api/organizer/uploads/poster"
              />
            </div>

            {/* Moved Save button inside the form */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2 rounded-md bg-primary hover:bg-primary-dull transition text-sm sm:text-base disabled:opacity-50"
                disabled={isBusy}
              >
                {isSaving ? (
                  <Loader2Icon className="w-4 h-4 mx-auto animate-spin" />
                ) : (
                  "Save Details"
                )}
              </button>
            </div>
          </form>

          {/* SEAT MAP Card */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-sm font-medium">Seat Map</p>
              {/* Link to view seatmap (if it exists) */}
              {hasSeatMap && (
                <a
                  href={`/events/${event._id}/seatmap`} // Link to public seatmap page
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/10 transition"
                >
                  View Seat Map
                </a>
              )}
            </div>

            {seatSummary ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-sm">
                <div className="rounded-md border border-white/10 bg-white/5 p-2 text-center sm:text-left">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-base sm:text-lg font-semibold">
                    {seatSummary.total}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-2 text-center sm:text-left">
                  <p className="text-xs text-gray-400">Available</p>
                  <p className="text-base sm:text-lg font-semibold">
                    {seatSummary.available}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-2 text-center sm:text-left">
                  <p className="text-xs text-gray-400">Reserved</p>
                  <p className="text-base sm:text-lg font-semibold">
                    {seatSummary.reserved}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-2 text-center sm:text-left">
                  <p className="text-xs text-gray-400">Sold</p>
                  <p className="text-base sm:text-lg font-semibold">
                    {seatSummary.sold}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs sm:text-sm text-gray-400">
                No seat map yet. Generate one below to enable publishing.
              </div>
            )}

            {/* New Generator UI */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-gray-400 mb-2">
                {hasSeatMap ? "Regenerate Grid" : "Generate Grid"}
                {hasSeatMap && (
                  <span className="text-yellow-400">
                    {" "}
                    (Warning: This replaces the existing map)
                  </span>
                )}
              </p>
              <GridGenerator
                eventId={event._id}
                isBusy={isGenBusy}
                setBusy={setIsGenBusy}
                onGenerated={refetch}
              />
            </div>

            {!hasSeatMap && (
              <div className="mt-3 text-xs text-yellow-200/90 rounded-md border border-yellow-400/30 bg-yellow-500/10 p-2 flex items-center gap-2">
                <ShieldOffIcon className="w-4 h-4 flex-shrink-0" />
                <span>
                  Publishing is disabled until a seat map is generated.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Venue + Actions */}
        <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-20 h-max">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-sm font-medium mb-2">Venue</p>
            <p className="text-xs text-gray-400 mb-2 sm:mb-3">
              Type: <b className="text-white">{event.venueType}</b>
            </p>

            {event.venueType === "template" ? (
              <div className="space-y-1 text-xs text-gray-400">
                <p>
                  <b>Name:</b> {event.venueName || "-"}
                </p>
                <p>
                  <b>Address:</b> {event.venueAddress || "-"}
                </p>
                <p className="mt-2 pt-2 border-t border-white/10">
                  Template venue details are read-only.
                </p>
              </div>
            ) : (
              // Custom venue fields are now part of the main "Basics" form
              <div className="space-y-2 text-xs text-gray-400">
                <p>
                  <b>Name:</b> {event.venueName || "-"}
                </p>
                <p>
                  <b>Address:</b> {event.venueAddress || "-"}
                </p>
                <p className="mt-2 pt-2 border-t border-white/10">
                  Edit custom venue details in the "Basics" form.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageEventPage;
