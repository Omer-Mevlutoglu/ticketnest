/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState, useEffect } from "react";

import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, Loader2Icon } from "lucide-react"; // Added Loader2Icon
import { useTemplateVenues } from "./hooks/useTemplateVenues"; // Import TemplateVenue
import SingleImageUploader from "../../components/organizer/SingleImageUploader"; // Adjust path as needed
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

  // form state
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
  const [submitting, setSubmitting] = useState(false); // Added submitting state

  // grid spec (only for custom)
  const [grid, setGrid] = useState<GridSpec>({
    rows: 10,
    cols: 10,
    defaultTier: "Standard",
    defaultPrice: 100,
    blocked: "",
  });

  const categories = useMemo(
    () =>
      categoriesInput
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    [categoriesInput]
  );

  const isTemplate = venueType === "template";
  // const canPublishOnCreate = isTemplate; // --- FIX: REMOVED UNUSED VARIABLE ---

  // --- New Derived State ---
  const selectedTemplateVenue = useMemo(() => {
    return venues.find((v) => v._id === templateVenueId);
  }, [venues, templateVenueId]);

  const templateHasSeats = useMemo(() => {
    return (selectedTemplateVenue?.defaultSeatMap?.length || 0) > 0;
  }, [selectedTemplateVenue]);

  // Disable "Published" option if template is chosen but has no seats
  useEffect(() => {
    if (isTemplate && !templateHasSeats && status === "published") {
      setStatus("draft"); // Demote to draft
    }
  }, [isTemplate, templateHasSeats, status]);
  // --- End New Derived State ---

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    // Validate minimal fields
    if (!title || !description || !startTime || !endTime) {
      setSubmitting(false);
      return toast.error("Title, description, and dates are required.");
    }
    if (startTime >= endTime) {
      setSubmitting(false);
      return toast.error("End time must be after start time.");
    }
    if (venueType === "template" && !templateVenueId) {
      setSubmitting(false);
      return toast.error("Please select a template venue.");
    }
    if (venueType === "custom" && (!venueName || !venueAddress)) {
      setSubmitting(false);
      return toast.error("Please fill custom venue name and address.");
    }
    // Check backend rules on client-side
    if (venueType === "custom" && status === "published") {
      setSubmitting(false);
      return toast.error("Custom venues must be created as draft first.");
    }
    if (
      venueType === "template" &&
      !templateHasSeats &&
      status === "published"
    ) {
      setSubmitting(false);
      return toast.error(
        "This template venue has no seats and cannot be published."
      );
    }

    // 1) Create the event
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
      } else {
        payload.venueName = venueName;
        payload.venueAddress = venueAddress;
        payload.status = "draft"; // enforce on client too for clarity
      }

      const res = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = (await res.json())?.message || (await res.text());
        throw new Error(txt || "Failed to create event");
      }
      const ev = await res.json();

      // 2) If custom → immediately generate a seat map using grid spec
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
                x > 0 &&
                Number.isInteger(y) &&
                y > 0
              ) {
                blockedSeats.push({ x, y });
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
          const txt = (await genRes.json())?.message || (await genRes.text());
          toast.error(
            "Event created, but seat map generation failed: " + (txt || "")
          );
          return nav(`/organizer/events/${ev._id}/manage`, { replace: true });
        }
      }

      toast.success(
        isTemplate
          ? templateHasSeats && status === "published"
            ? "Event created & published!"
            : "Event created!"
          : "Event created (draft) & seat map generated!"
      );

      nav(`/organizer/events/${ev._id}/manage`, { replace: true }); // Go to manage page
    } catch (e: any) {
      toast.error(e?.message || "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative p-2 py-4 sm:px-6 md:px-8 overflow-x-hidden">
      <BlurCircle top="-60px" left="-80px" />
      <BlurCircle bottom="-40px" right="-60px" />

      <h1 className="text-base xs:text-lg sm:text-xl md:text-2xl font-semibold">
        Create Event
      </h1>
      <p className="text-xs sm:text-sm text-gray-400 mt-1">
        Set up your event; we’ll handle seat maps for templates automatically.
      </p>

      {venuesLoading ? (
        <div className="mt-6">
          <Loading />
        </div>
      ) : venuesError ? (
        <div className="mt-6 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3">
          <p className="text-rose-300 text-sm">{venuesError}</p>
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
      >
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
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
                  placeholder="music, live, festival"
                />
              </div>
            </div>

            <div className="mt-3 sm:mt-4">
              <label className="text-xs text-gray-400 block mb-1">
                Description
              </label>
              <textarea
                className="w-full min-h-[90px] sm:min-h-[110px] rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
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
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-sm font-medium mb-3">Venue</p>

            <div className="flex gap-4 xs:gap-6 items-center">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={venueType === "template"}
                  onChange={() => setVenueType("template")}
                />
                Template
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={venueType === "custom"}
                  onChange={() => setVenueType("custom")}
                />
                Custom
              </label>
            </div>

            {venueType === "template" ? (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Select Template Venue
                  </label>
                  <select
                    className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                    value={templateVenueId}
                    onChange={(e) => setTemplateVenueId(e.target.value)}
                    disabled={venuesLoading}
                  >
                    <option value="">-- choose --</option>
                    {venues.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.name} • {v.address}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Status
                  </label>
                  <select
                    className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base disabled:opacity-50"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    disabled={!templateVenueId} // Disable until venue is selected
                  >
                    <option value="draft">Draft</option>
                    <option value="published" disabled={!templateHasSeats}>
                      {" "}
                      {/* Disable if no seats */}
                      Published {!templateHasSeats ? "(No seats)" : ""}
                    </option>
                    <option value="archived">Archived</option>
                  </select>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                    Templates can publish if they have a seat map.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Venue Name
                  </label>
                  <input
                    className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    required
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
                    required
                  />
                </div>

                <div className="md:col-span-2 mt-2">
                  <p className="text-xs text-gray-400 mb-2">
                    We’ll generate a <b>grid</b> seat map right away.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        Rows
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                        value={grid.rows}
                        onChange={(e) =>
                          setGrid({ ...grid, rows: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        Cols
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                        value={grid.cols}
                        onChange={(e) =>
                          setGrid({ ...grid, cols: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        Default Tier
                      </label>
                      <input
                        className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                        value={grid.defaultTier}
                        onChange={(e) =>
                          setGrid({ ...grid, defaultTier: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">
                        Default Price
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                        value={grid.defaultPrice}
                        onChange={(e) =>
                          setGrid({
                            ...grid,
                            defaultPrice: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs text-gray-400 block mb-1">
                      Blocked seats (optional) — <code>row,col; row,col</code>
                    </label>
                    <input
                      className="w-full rounded-md border border-white/10 bg-white/5 px-2.5 sm:px-3 py-1.5 sm:py-2 outline-none text-sm sm:text-base"
                      placeholder="1,5; 2,7"
                      value={grid.blocked}
                      onChange={(e) =>
                        setGrid({ ...grid, blocked: e.target.value })
                      }
                    />
                  </div>

                  <div className="mt-3 rounded-md border border-yellow-400/30 bg-yellow-500/10 p-2 sm:p-3 text-xs text-yellow-200">
                    Custom venue events are created as <b>draft</b>.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column (actions) */}
        <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-20 h-max">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <p className="text-sm font-medium mb-2">Review & Create</p>
            <p className="text-xs text-gray-400">
              Double-check your details. You can always edit later.
            </p>
            <button
              type="submit"
              className="mt-4 w-full px-4 py-2 rounded-md bg-primary hover:bg-primary-dull transition disabled:opacity-50"
              disabled={submitting || venuesLoading}
            >
              {submitting ? (
                <Loader2Icon className="w-4 h-4 mx-auto animate-spin" />
              ) : (
                "Create Event"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateEventPage;
