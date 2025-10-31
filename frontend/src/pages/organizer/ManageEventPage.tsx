/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { RocketIcon, ShieldOffIcon } from "lucide-react";
import { useMyEvent } from "./hooks/useMyEvent"; // Assuming hooks are in ./hooks/
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";
import SingleImageUploader from "../../components/organizer/SingleImageUploader";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

const ManageEventPage: React.FC = () => {
  const { id } = useParams();
  const { event, seatSummary, loading, error, refetch } = useMyEvent(id);

  // local form state mirrors event
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [categoriesInput, setCategoriesInput] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [poster, setPoster] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false); // Added saving state

  // seed form when event changes
  React.useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setDesc(event.description);
    setCategoriesInput(event.categories?.join(", ") || "");
    // Ensure dates are correctly formatted for datetime-local input
    const formatForInput = (iso: string | undefined) =>
      iso ? iso.slice(0, 16) : ""; // YYYY-MM-DDTHH:mm
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
    // Make event optional for button onClick
    if (e) e.preventDefault();
    if (!id || isSaving) return;

    // Basic date validation
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      toast.error("End time must be after start time.");
      return;
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

      // Backend only allows editing these fields for custom venue:
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
      refetch(); // Refetch to get latest data including potentially updated fields
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function publishEvent() {
    if (!id || isSaving) return;
    setIsSaving(true);
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
      // Typical backend error here: "Cannot publish without a seat map"
      toast.error(e?.message || "Failed to publish");
    } finally {
      setIsSaving(false);
    }
  }

  // Simplified generateGrid - Removed prompt, uses fixed values or needs a modal
  async function generateGrid() {
    if (!id || isSaving) return;

    // --- TODO: Replace prompts with a proper modal form ---
    const rows = 10;
    const cols = 12;
    const tier = "Standard";
    const price = 50;
    // --- End TODO ---

    setIsSaving(true);
    try {
      const spec = {
        rows,
        cols,
        default: { tier, price },
      };
      const res = await fetch(`${API_BASE}/api/events/${id}/seatmap/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Seat map generated (using defaults)");
      refetch(); // Refetch includes seatmap check now
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate seat map");
    } finally {
      setIsSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (error || !event) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-center p-4">
        {" "}
        {/* Added padding */}
        <p className="text-red-400">{error || "Event not found"}</p>
      </div>
    );
  }

  const canEditVenueBasics = event.venueType === "custom";
  const hasSeatMap = !!event.seatMapId;
  const canPublish = hasSeatMap || event.venueType === "template"; // Allow publish attempt if template

  return (
    // Smallest base padding (px-2 py-4)
    <div className="relative px-2 py-4 sm:px-6 md:px-8 overflow-x-hidden">
      <BlurCircle top="-60px" left="-80px" />
      <BlurCircle bottom="-40px" right="-60px" />

      {/* Header stacks below sm */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="min-w-0 flex-1 w-full sm:w-auto">
          {" "}
          {/* Ensure takes width below sm */}
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold break-words">
            Manage Event
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 truncate mt-1">
            ID: {event._id}
          </p>{" "}
          {/* Truncate ID */}
        </div>

        {/* Buttons wrap */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
          <span
            // Smaller base padding/text
            className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full border whitespace-nowrap ${
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
              // Smaller base padding/text
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md bg-primary hover:bg-primary-dull transition text-xs sm:text-sm disabled:opacity-50"
              onClick={publishEvent}
              title="Publish"
              disabled={isSaving || !canPublish} // Disable if saving or cannot publish
            >
              <RocketIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Publish
            </button>
          )}
        </div>
      </div>

      {/* EDIT FORM */}
      {/* Use form element for semantics, but buttons have own handlers */}
      <div className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Basics */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Basics Card */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-sm font-medium mb-3">Basics</p>
            {/* Grid-cols-1 base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Title
                </label>{" "}
                {/* block label */}
                <input
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isSaving}
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
                  disabled={isSaving}
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
                disabled={isSaving}
              />
            </div>

            {/* Grid-cols-1 base */}
            <div className="mt-3 sm:mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Start
                </label>
                {/* Simplified date input wrapper */}
                <input
                  type="datetime-local"
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base appearance-none" // Use appearance-none with custom icon if needed
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">End</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base appearance-none"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  disabled={isSaving}
                />
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
          </div>

          {/* SEAT MAP Card */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              {" "}
              {/* Added flex-wrap */}
              <p className="text-sm font-medium">Seat Map</p>
              <button
                type="button"
                onClick={generateGrid}
                // Smaller base padding/text
                className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-md border border-white/10 hover:bg-white/10 transition whitespace-nowrap disabled:opacity-50"
                disabled={isSaving}
              >
                {hasSeatMap
                  ? "Regenerate Grid (Defaults)"
                  : "Generate Grid (Defaults)"}
              </button>
            </div>

            {seatSummary ? (
              // Grid-cols-2 base
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-sm">
                {/* Reduced internal padding (p-2) */}
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
                No seat map yet. Generate a grid to enable publishing.
              </div>
            )}

            {!canPublish &&
              event.status !== "published" && ( // Show warning only if needed
                <div className="mt-3 text-xs text-yellow-200/90 rounded-md border border-yellow-400/30 bg-yellow-500/10 p-2 flex items-center gap-2">
                  <ShieldOffIcon className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Publishing requires a valid seat map. Generate one first.
                  </span>
                </div>
              )}
          </div>
        </div>

        {/* Right: Venue + Actions */}
        {/* Make this column sticky on large screens */}
        <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-20 h-max">
          {/* Venue Card */}
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
                  Template venue details are read-only here.
                </p>
              </div>
            ) : (
              // Stack inputs vertically
              <div className="space-y-2 sm:space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Venue Name
                  </label>
                  <input
                    className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Venue Address
                  </label>
                  <input
                    className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                {/* Removed redundant warning */}
              </div>
            )}
          </div>

          {/* Save Card */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-sm font-medium mb-2">Save Changes</p>
            <p className="text-xs text-gray-400 mb-3 sm:mb-4">
              Update the event details and venue info (if applicable).
            </p>
            <button
              type="button" // Change type to button as form has no onSubmit
              onClick={() => saveBasics()} // Use onClick
              className="w-full px-4 py-2 rounded-md bg-primary hover:bg-primary-dull transition text-sm sm:text-base disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Details"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageEventPage;
