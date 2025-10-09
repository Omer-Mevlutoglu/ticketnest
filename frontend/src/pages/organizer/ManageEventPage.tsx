/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";
import toast from "react-hot-toast";
import { CalendarIcon, RocketIcon, ShieldOffIcon } from "lucide-react";
import { useMyEvent } from "./hooks/useMyEvent";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // seed form when event changes
  React.useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setDesc(event.description);
    setCategoriesInput(event.categories?.join(", ") || "");
    setStartTime(event.startTime?.slice(0, 16) || "");
    setEndTime(event.endTime?.slice(0, 16) || "");
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

  async function saveBasics(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
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
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    }
  }

  async function publishEvent() {
    if (!id) return;
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
    }
  }

  async function generateGrid() {
    if (!id) return;
    // quick helper dialog: rows/cols/tier/price
    const rowsStr = prompt("Rows (1-200)", "10");
    const colsStr = prompt("Cols (1-200)", "12");
    const tier = prompt("Default tier", "Standard") || "Standard";
    const priceStr = prompt("Default price", "100");

    const rows = Number(rowsStr);
    const cols = Number(colsStr);
    const price = Number(priceStr);

    if (
      !Number.isInteger(rows) ||
      !Number.isInteger(cols) ||
      rows < 1 ||
      cols < 1
    ) {
      return toast.error("Invalid grid dimensions");
    }
    if (!Number.isFinite(price) || price < 0) {
      return toast.error("Invalid price");
    }

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
      toast.success("Seat map generated");
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate seat map");
    }
  }

  if (loading) return <Loading />;
  if (error || !event) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-center">
        <p className="text-red-400">{error || "Event not found"}</p>
      </div>
    );
  }

  const canEditVenueBasics = event.venueType === "custom";
  const hasSeatMap = !!event.seatMapId;

  return (
    <div className="relative p-6 md:p-8">
      <BlurCircle top="-60px" left="-80px" />
      <BlurCircle bottom="-40px" right="-60px" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Manage Event</h1>
          <p className="text-sm text-gray-400">{event._id}</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border ${
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
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-dull transition"
              onClick={publishEvent}
              title="Publish"
            >
              <RocketIcon className="w-4 h-4" />
              Publish
            </button>
          )}
        </div>
      </div>

      {/* EDIT FORM */}
      <form
        onSubmit={saveBasics}
        className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left: Basics */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <p className="text-sm font-medium mb-3">Basics</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">Title</label>
                <input
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-400">
                  Categories (comma separated)
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                  value={categoriesInput}
                  onChange={(e) => setCategoriesInput(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs text-gray-400">Description</label>
              <textarea
                className="mt-1 w-full min-h-[110px] rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                required
              />
            </div>

            <div className="mt-3 grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">Start</label>
                <div className="mt-1 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 opacity-75" />
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400">End</label>
                <div className="mt-1 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 opacity-75" />
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs text-gray-400">Poster (URL)</label>
              <input
                className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                value={poster}
                onChange={(e) => setPoster(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* SEAT MAP */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Seat Map</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={generateGrid}
                  className="text-xs px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/10 transition"
                >
                  {hasSeatMap ? "Regenerate Grid" : "Generate Grid"}
                </button>
              </div>
            </div>

            {seatSummary ? (
              <div className="mt-3 grid grid-cols-4 gap-3 text-sm">
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="text-gray-400">Total</p>
                  <p className="text-lg font-semibold">{seatSummary.total}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="text-gray-400">Available</p>
                  <p className="text-lg font-semibold">
                    {seatSummary.available}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="text-gray-400">Reserved</p>
                  <p className="text-lg font-semibold">
                    {seatSummary.reserved}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/5 p-3">
                  <p className="text-gray-400">Sold</p>
                  <p className="text-lg font-semibold">{seatSummary.sold}</p>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-400">
                No seat map yet. Generate a grid to enable publishing.
              </div>
            )}

            <div className="mt-3 text-xs text-gray-400 flex items-center gap-2">
              <ShieldOffIcon className="w-4 h-4" />
              <span>
                Remember: publishing requires a valid seat map (your backend
                enforces it).
              </span>
            </div>
          </div>
        </div>

        {/* Right: Venue + Actions */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <p className="text-sm font-medium mb-2">Venue</p>
            <p className="text-xs text-gray-400">
              Type: <b>{event.venueType}</b>
            </p>

            {event.venueType === "template" ? (
              <div className="mt-2 text-xs text-gray-400">
                <p>
                  <b>Name:</b> {event.venueName || "-"}
                </p>
                <p>
                  <b>Address:</b> {event.venueAddress || "-"}
                </p>
                <p className="mt-2">
                  Template venue details are read-only here.
                </p>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-xs text-gray-400">Venue Name</label>
                  <input
                    className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Venue Address</label>
                  <input
                    className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                  />
                </div>
                <p className="text-xs text-yellow-200/90 rounded-md border border-yellow-400/30 bg-yellow-500/10 p-2">
                  Custom venues cannot publish on create; once the seat map is
                  ready, you can publish.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <p className="text-sm font-medium mb-2">Save Changes</p>
            <button
              type="submit"
              className="w-full px-4 py-2 rounded-md bg-primary hover:bg-primary-dull transition"
              onClick={saveBasics}
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ManageEventPage;
