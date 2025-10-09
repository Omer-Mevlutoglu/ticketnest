/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { CalendarIcon } from "lucide-react";
import { useTemplateVenues } from "./hooks/useTemplateVenues";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const canPublishOnCreate = isTemplate; // matches backend rule

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate minimal fields
    if (!title || !description || !startTime || !endTime) {
      return toast.error("Title, description, and dates are required.");
    }
    if (venueType === "template" && !templateVenueId) {
      return toast.error("Please select a template venue.");
    }
    if (venueType === "custom" && (!venueName || !venueAddress)) {
      return toast.error("Please fill custom venue name and address.");
    }
    if (venueType === "custom" && status === "published") {
      return toast.error("Custom venues cannot be published at creation.");
    }

    // 1) Create the event
    try {
      const payload: any = {
        title,
        description,
        categories,
        status, // allowed draft/published when template; draft only if custom
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
        const txt = await res.text();
        throw new Error(txt || "Failed to create event");
      }
      const ev = await res.json();

      // 2) If custom → immediately generate a seat map using grid spec
      if (!isTemplate) {
        const blockedSeats: Array<{ x: number; y: number }> = [];
        if (grid.blocked && grid.blocked.trim().length > 0) {
          // format: "1,2; 3,4"
          grid.blocked
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((pair) => {
              const [xs, ys] = pair.split(",").map((n) => n.trim());
              const x = parseInt(xs, 10);
              const y = parseInt(ys, 10);
              if (Number.isInteger(x) && Number.isInteger(y)) {
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
          const txt = await genRes.text();
          toast.error(
            "Event created, but seat map generation failed: " + (txt || "")
          );
          // still navigate to event manage page
          return nav(`/organizer/events/${ev._id}`, { replace: true });
        }
      }

      toast.success(
        isTemplate
          ? canPublishOnCreate && status === "published"
            ? "Event created & published!"
            : "Event created!"
          : "Event created (draft) & seat map generated!"
      );

      nav(`/organizer/events/${ev._id}`, { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Failed to create event");
    }
  }

  return (
    <div className="relative p-6 md:p-8">
      <BlurCircle top="-60px" left="-80px" />
      <BlurCircle bottom="-40px" right="-60px" />

      <h1 className="text-2xl font-semibold">Create Event</h1>
      <p className="text-sm text-gray-400">
        Set up your event; we’ll handle seat maps for templates automatically.
        For custom, we’ll generate a grid seat map right away.
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
        className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Left column */}
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
                  placeholder="music, live, festival"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs text-gray-400">Description</label>
              <textarea
                className="mt-1 w-full min-h-[110px] rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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

          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <p className="text-sm font-medium mb-3">Venue</p>

            <div className="flex gap-6 items-center">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={venueType === "template"}
                  onChange={() => setVenueType("template")}
                />
                Template
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={venueType === "custom"}
                  onChange={() => setVenueType("custom")}
                />
                Custom
              </label>
            </div>

            {venueType === "template" ? (
              <div className="mt-3 grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">
                    Select Template Venue
                  </label>
                  <select
                    className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                    value={templateVenueId}
                    onChange={(e) => setTemplateVenueId(e.target.value)}
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
                  <label className="text-xs text-gray-400">Status</label>
                  <select
                    className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Templates with default seats can be published immediately.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-3 grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Venue Name</label>
                  <input
                    className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Venue Address</label>
                  <input
                    className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    required
                  />
                </div>

                <div className="md:col-span-2 mt-2">
                  <p className="text-xs text-gray-400 mb-2">
                    We’ll generate a <b>grid</b> seat map right away.
                  </p>
                  <div className="grid md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-gray-400">Rows</label>
                      <input
                        type="number"
                        min={1}
                        className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                        value={grid.rows}
                        onChange={(e) =>
                          setGrid({ ...grid, rows: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Cols</label>
                      <input
                        type="number"
                        min={1}
                        className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                        value={grid.cols}
                        onChange={(e) =>
                          setGrid({ ...grid, cols: Number(e.target.value) })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">
                        Default Tier
                      </label>
                      <input
                        className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                        value={grid.defaultTier}
                        onChange={(e) =>
                          setGrid({ ...grid, defaultTier: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">
                        Default Price
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
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
                    <label className="text-xs text-gray-400">
                      Blocked seats (optional) — format:{" "}
                      <code>row,col; row,col</code> (1-based)
                    </label>
                    <input
                      className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                      placeholder="1,5; 2,7"
                      value={grid.blocked}
                      onChange={(e) =>
                        setGrid({ ...grid, blocked: e.target.value })
                      }
                    />
                  </div>

                  <div className="mt-3 rounded-md border border-yellow-400/30 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                    Custom venue events are created as <b>draft</b>. After seat
                    map generation, review and publish from the manage page.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column (actions) */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <p className="text-sm font-medium mb-2">Review & Create</p>
            <p className="text-xs text-gray-400">
              Double-check your details. You can always edit later.
            </p>
            <button
              type="submit"
              className="mt-4 w-full px-4 py-2 rounded-md bg-primary hover:bg-primary-dull transition"
            >
              Create Event
            </button>
          </div>

          {isTemplate && (
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-4">
              <p className="text-sm font-medium mb-2">Publishing</p>
              <p className="text-xs text-gray-400">
                If the template venue has a default seat map, publishing on
                create is allowed.
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default CreateEventPage;
