/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { CalendarIcon } from "lucide-react";
import { useTemplateVenues } from "./hooks/useTemplateVenues"; // Assuming hooks are in ./hooks/
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

type VenueType = "template" | "custom";
type Status = "draft" | "published" | "archived";

type GridSpec = {
  rows: number;
  cols: number;
  defaultTier: string;
  defaultPrice: number;
  blocked?: string; // comma separated "x,y; x,y"
};

const CreateEventPage: React.FC = () => {
  const nav = useNavigate();
  const {
    venues,
    loading: venuesLoading,
    error: venuesError,
  } = useTemplateVenues();

  // form state remains the same
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoriesInput, setCategoriesInput] = useState("");
  const [status, setStatus] = useState<Status>("draft");

  const [venueType, setVenueType] = useState<VenueType>("template");
  const [templateVenueId, setTemplateVenueId] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");

  const [startTime, setStartTime] = useState(""); // ISO string
  const [endTime, setEndTime] = useState(""); // ISO string
  const [poster, setPoster] = useState("");

  const [grid, setGrid] = useState<GridSpec>({
    rows: 10,
    cols: 10,
    defaultTier: "Standard",
    defaultPrice: 100,
    blocked: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const categories = useMemo(
    () =>
      categoriesInput
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    [categoriesInput]
  );

  const isTemplate = venueType === "template";
  const selectedTemplate = useMemo(() => {
    return venues.find((v) => v._id === templateVenueId);
  }, [venues, templateVenueId]);
  const templateHasSeats = !!(
    selectedTemplate?.defaultSeatMap &&
    selectedTemplate.defaultSeatMap.length > 0
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const canPublishOnCreate = isTemplate && templateHasSeats;

  // Reset status to draft if switching to a template without seats while 'published' is selected
  React.useEffect(() => {
    if (isTemplate && status === "published" && !templateHasSeats) {
      setStatus("draft");
      toast.error("Selected template has no seats, status reset to draft.", {
        duration: 3000,
      });
    }
    // Also reset status if switching from template to custom while published selected
    if (!isTemplate && status === "published") {
      setStatus("draft");
      toast.error("Custom venues must be draft, status reset.", {
        duration: 3000,
      });
    }
  }, [venueType, templateVenueId, templateHasSeats, status, isTemplate]);

  // onSubmit logic remains largely the same, validation already improved
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate minimal fields
    if (!title || !description || !startTime || !endTime) {
      return toast.error("Title, description, and dates are required.");
    }
    if (new Date(startTime) >= new Date(endTime)) {
      return toast.error("Start time must be before end time.");
    }
    if (venueType === "template" && !templateVenueId) {
      return toast.error("Please select a template venue.");
    }
    if (venueType === "custom" && (!venueName || !venueAddress)) {
      return toast.error("Please fill custom venue name and address.");
    }
    if (
      venueType === "template" &&
      status === "published" &&
      !templateHasSeats
    ) {
      return toast.error(
        "Cannot publish: selected template venue has no default seat map defined by admin."
      );
    }
    if (venueType === "custom" && status === "published") {
      return toast.error("Custom venues must be created as draft first.");
    }

    setSubmitting(true);
    try {
      const payload: any = {
        title,
        description,
        categories,
        status,
        venueType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        poster: poster || undefined,
      };

      if (isTemplate) {
        payload.templateVenueId = templateVenueId;
        if (status === "published" && !templateHasSeats) {
          payload.status = "draft";
        }
      } else {
        payload.venueName = venueName;
        payload.venueAddress = venueAddress;
        payload.status = "draft";
      }

      const res = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create event");
      }
      const ev = await res.json();

      if (!isTemplate) {
        const blockedSeats: Array<{ x: number; y: number }> = [];
        if (grid.blocked && grid.blocked.trim().length > 0) {
          grid.blocked
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((pair) => {
              const [xs, ys] = pair.split(",").map((n) => n.trim());
              const x = parseInt(xs, 10);
              const y = parseInt(ys, 10);
              if (
                Number.isInteger(x) &&
                Number.isInteger(y) &&
                x > 0 &&
                y > 0
              ) {
                blockedSeats.push({ x, y });
              } else {
                console.warn(`Invalid blocked seat format ignored: ${pair}`);
                toast.error(
                  `Invalid format for blocked seat ignored: ${pair}`,
                  { duration: 4000 }
                );
              }
            });
        }

        const spec = {
          rows: grid.rows,
          cols: grid.cols,
          default: { tier: grid.defaultTier, price: Number(grid.defaultPrice) },
          blockedSeats: blockedSeats,
        };

        const genRes = await fetch(
          `${API_BASE}/api/events/${ev._id}/seatmap/generate`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(spec),
          }
        );
        if (!genRes.ok) {
          const txt = await genRes.text();
          toast.error(
            "Event created, but seat map generation failed: " + (txt || "")
          );
          return nav(`/organizer/events/${ev._id}/manage`, { replace: true });
        }
      }

      toast.success(
        isTemplate
          ? payload.status === "published"
            ? "Event created & published!"
            : "Event created!"
          : "Event created (draft) & seat map generated!"
      );

      nav(`/organizer/events/${ev._id}/manage`, { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // Reduced base padding
    <div className="relative p-4 sm:p-6 md:p-8 overflow-x-hidden">
      <BlurCircle top="-60px" left="-80px" />
      <BlurCircle bottom="-40px" right="-60px" />

      {/* Ensure full width */}
      <div className="w-full max-w-full">
        <h1 className="text-xl sm:text-2xl font-semibold">Create Event</h1>
        <p className="text-sm text-gray-400 max-w-2xl mt-1">
          Set up your event details below. Seat maps for templates are added
          automatically if available.
        </p>

        {venuesLoading ? (
          <div className="mt-6">
            <Loading />
          </div>
        ) : venuesError ? (
          <div className="mt-6 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3">
            <p className="text-rose-300 text-sm break-words">{venuesError}</p>
          </div>
        ) : null}

        <form
          onSubmit={onSubmit}
          // Use gap-4 for slightly less spacing on mobile
          className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basics Card */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium mb-3">Event Details</p>
              {/* Use space-y-3 for consistent spacing */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block">Title</label>
                    <input
                      className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm" // Ensure text size consistency
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block">
                      Categories (comma separated)
                    </label>
                    <input
                      className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm"
                      value={categoriesInput}
                      onChange={(e) => setCategoriesInput(e.target.value)}
                      placeholder="music, live, festival"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block">
                    Description
                  </label>
                  <textarea
                    className="mt-1 w-full min-h-[90px] rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm" // Reduced min-height slightly
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block">
                      Start Time
                    </label>
                    <div className="mt-1 relative">
                      <CalendarIcon className="w-4 h-4 opacity-75 pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="datetime-local"
                        className="w-full rounded-md border border-white/10 bg-white/5 pl-8 pr-3 py-2 outline-none text-sm" // Adjusted padding
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block">
                      End Time
                    </label>
                    <div className="mt-1 relative">
                      <CalendarIcon className="w-4 h-4 opacity-75 pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="datetime-local"
                        className="w-full rounded-md border border-white/10 bg-white/5 pl-8 pr-3 py-2 outline-none text-sm" // Adjusted padding
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block">
                    Poster URL (Optional)
                  </label>
                  <input
                    className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm"
                    value={poster}
                    onChange={(e) => setPoster(e.target.value)}
                    placeholder="https://..."
                    type="url"
                  />
                </div>
              </div>
            </div>

            {/* Venue Card */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium mb-3">Venue Setup</p>

              <div className="flex flex-wrap gap-x-6 gap-y-2 items-center mb-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  {" "}
                  {/* Added text-sm */}
                  <input
                    type="radio"
                    checked={venueType === "template"}
                    onChange={() => setVenueType("template")}
                    name="venueType" // Add name for radio group
                  />
                  Use Template Venue
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  {" "}
                  {/* Added text-sm */}
                  <input
                    type="radio"
                    checked={venueType === "custom"}
                    onChange={() => setVenueType("custom")}
                    name="venueType" // Add name for radio group
                  />
                  Use Custom Venue
                </label>
              </div>

              {venueType === "template" ? (
                // Template Venue Fields
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block">
                      Select Template
                    </label>
                    <select
                      className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none appearance-none bg-no-repeat bg-right pr-8 text-sm" // Added text-sm
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: "right 0.5rem center",
                        backgroundSize: "1.5em 1.5em",
                      }}
                      value={templateVenueId}
                      onChange={(e) => setTemplateVenueId(e.target.value)}
                      required
                    >
                      <option value="">-- Select a venue --</option>
                      {venues.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.name} ({v.address})
                        </option>
                      ))}
                    </select>
                    {!venuesLoading && venues.length === 0 && (
                      <p className="text-xs text-yellow-400 mt-1">
                        No template venues available. Ask admin to create one.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 block">
                      Status
                    </label>
                    <select
                      className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none appearance-none bg-no-repeat bg-right pr-8 text-sm" // Added text-sm
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: "right 0.5rem center",
                        backgroundSize: "1.5em 1.5em",
                      }}
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      disabled={!templateVenueId} // Keep disabled until venue selected
                    >
                      <option value="draft">Draft</option>
                      {templateHasSeats && (
                        <option value="published">Published</option>
                      )}
                      <option value="archived">Archived</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1 h-8">
                      {" "}
                      {/* Reserve space for message */}
                      {
                        templateVenueId && !templateHasSeats
                          ? "Template has no seats defined, cannot publish yet."
                          : templateVenueId && templateHasSeats
                          ? "Publishing allowed for this template."
                          : "" // No message if nothing selected
                      }
                    </p>
                  </div>
                </div>
              ) : (
                // Custom Venue Section
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block">
                        Custom Venue Name
                      </label>
                      <input
                        className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm"
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block">
                        Custom Venue Address
                      </label>
                      <input
                        className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm"
                        value={venueAddress}
                        onChange={(e) => setVenueAddress(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Seat Map Generation Section */}
                  <div className="pt-2 space-y-3">
                    <p className="text-xs text-gray-400 font-medium">
                      Generate Grid Seat Map (Required for Custom Venue)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-400 block">
                          Rows
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={200}
                          required
                          className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm"
                          value={grid.rows}
                          onChange={(e) =>
                            setGrid({
                              ...grid,
                              rows: Math.max(1, Number(e.target.value)),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block">
                          Seats/Row
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={200}
                          required
                          className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm"
                          value={grid.cols}
                          onChange={(e) =>
                            setGrid({
                              ...grid,
                              cols: Math.max(1, Number(e.target.value)),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block">
                          Default Tier
                        </label>
                        <input
                          className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm"
                          value={grid.defaultTier}
                          required
                          onChange={(e) =>
                            setGrid({ ...grid, defaultTier: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block">
                          Default Price
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          required
                          className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm"
                          value={grid.defaultPrice}
                          onChange={(e) =>
                            setGrid({
                              ...grid,
                              defaultPrice: Math.max(0, Number(e.target.value)),
                            })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block">
                        Blocked Seats (Optional) - Format:{" "}
                        <code className="text-[11px]">row,col; row,col</code>
                      </label>
                      <input
                        className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none text-sm"
                        placeholder="e.g., 1,5; 2,7 (1-based index)"
                        value={grid.blocked}
                        onChange={(e) =>
                          setGrid({ ...grid, blocked: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="!mt-4 rounded-md border border-yellow-400/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                    Custom events are created as <b>draft</b>. After the seat
                    map is generated, you can manage and publish the event.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column (actions) - Sticky */}
          {/* Ensure the parent grid column allows this to be sticky */}
          <div className="lg:sticky lg:top-20 h-max space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium mb-2">Actions</p>
              <p className="text-xs text-gray-400 mb-3">
                Review your details before creating the event.
              </p>
              <button
                type="submit"
                disabled={submitting || venuesLoading}
                className="w-full px-4 py-2 rounded-md bg-primary hover:bg-primary-dull transition disabled:opacity-50 text-sm font-medium" // Added text-sm, font-medium
              >
                {submitting ? "Creating Event..." : "Create Event"}
              </button>
            </div>

            {/* Conditional Info Boxes */}
            {isTemplate && templateVenueId && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium mb-2">Template Venue Info</p>
                <p className="text-xs text-gray-400">
                  {templateHasSeats
                    ? "This template has default seats defined. You can choose to publish immediately if desired."
                    : "This template has no default seats. The event will be created as a draft, and you'll need to define a seat map manually."}
                </p>
              </div>
            )}
            {!isTemplate && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium mb-2">Custom Venue Info</p>
                <p className="text-xs text-gray-400">
                  A seat map will be generated using your grid specifications.
                  The event will start in <b>draft</b> status.
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventPage;
