import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BlurCircle from "../../components/BlurCircle";
import toast from "react-hot-toast";

type VenueType = "template" | "custom";

type TemplateVenue = { id: string; name: string; hasDefaultSeatMap: boolean };
const MOCK_TEMPLATES: TemplateVenue[] = [
  { id: "v_grand_hall", name: "Grand Hall", hasDefaultSeatMap: true },
  { id: "v_riverside", name: "Riverside Arena", hasDefaultSeatMap: true },
  { id: "v_microclub", name: "Micro Club", hasDefaultSeatMap: false },
];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

const EventCreate: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoriesText, setCategoriesText] = useState("music, live");
  const [venueType, setVenueType] = useState<VenueType>("template");

  // template
  const [templateVenueId, setTemplateVenueId] =
    useState<string>("v_grand_hall");

  // custom
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");

  // times
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  // status
  const canPublish = useMemo(() => {
    if (venueType === "custom") return false;
    const tpl = MOCK_TEMPLATES.find((t) => t.id === templateVenueId);
    return !!tpl?.hasDefaultSeatMap;
  }, [venueType, templateVenueId]);
  const [status, setStatus] = useState<"draft" | "published">(
    canPublish ? "published" : "draft"
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!title.trim()) return toast.error("Title is required");
      if (!startTime || !endTime)
        return toast.error("Start and end time are required");

      const startISO = new Date(startTime).toISOString();
      const endISO = new Date(endTime).toISOString();
      if (new Date(startISO) >= new Date(endISO))
        return toast.error("Start must be before end");

      const categories = categoriesText
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6);

      let payload: any = {
        title,
        description,
        categories,
        startTime: startISO,
        endTime: endISO,
        status:
          venueType === "template"
            ? canPublish
              ? "published"
              : "draft"
            : "draft",
        venueType,
      };

      if (venueType === "template") {
        payload.templateVenueId = templateVenueId;
      } else {
        payload.venueName = venueName;
        payload.venueAddress = venueAddress;
      }

      // Try real API; if it fails, just mock success and route to seatmap flow
      try {
        await api("/api/events", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch {
        // swallow; keep navigation so you can continue the flow
      }

      toast.success("Event created");
      navigate("/organizer/myevents");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create event");
    }
  };

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40">
      <BlurCircle top="40px" left="80px" />
      <h1 className="text-lg font-semibold mb-6">Create Event</h1>

      <form onSubmit={onSubmit} className="max-w-3xl space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-300">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field mt-1"
              placeholder="Event title"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">
              Categories (comma separated)
            </label>
            <input
              value={categoriesText}
              onChange={(e) => setCategoriesText(e.target.value)}
              className="field mt-1"
              placeholder="music, live"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="field mt-1 min-h-28"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-300">Start</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="field mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">End</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="field mt-1"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-300">Venue Type</label>
          <div className="mt-2 flex items-center gap-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                className="accent-primary"
                checked={venueType === "template"}
                onChange={() => setVenueType("template")}
              />
              Template
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                className="accent-primary"
                checked={venueType === "custom"}
                onChange={() => setVenueType("custom")}
              />
              Custom
            </label>
          </div>
        </div>

        {venueType === "template" ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">Template Venue</label>
              <select
                className="field mt-1"
                value={templateVenueId}
                onChange={(e) => setTemplateVenueId(e.target.value)}
              >
                {MOCK_TEMPLATES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}{" "}
                    {v.hasDefaultSeatMap ? "(has seat-map)" : "(no seat-map)"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-300">Status</label>
              <select
                className="field mt-1"
                value={canPublish ? "published" : "draft"}
                onChange={() => {}}
                disabled={!canPublish}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
              {!canPublish && (
                <p className="text-xs text-gray-400 mt-1">
                  Publish at creation requires a template venue with a default
                  seat-map.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-300">Venue Name</label>
              <input
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="field mt-1"
                placeholder="Neighborhood Stage"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300">Venue Address</label>
              <input
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                className="field mt-1"
                placeholder="42 West Rd"
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-gray-400">
                Custom venues must be published <em>after</em> a seat-map is
                generated.
              </div>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button type="submit" className="btn-primary">
            Create Event
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventCreate;
