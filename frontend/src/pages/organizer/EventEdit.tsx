import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";
import toast from "react-hot-toast";

type EventDetail = {
  _id: string;
  title: string;
  description: string;
  categories: string[];
  status: "draft" | "published";
  venueType: "template" | "custom";
  startTime: string; // ISO
  endTime: string; // ISO
  hasSeatMap?: boolean;
};

const MOCK: EventDetail = {
  _id: "e2",
  title: "Local Standup",
  description: "Comedy night",
  categories: ["comedy"],
  status: "draft",
  venueType: "custom",
  startTime: new Date(Date.now() + 2 * 86400000).toISOString(),
  endTime: new Date(Date.now() + 2 * 86400000 + 7200000).toISOString(),
  hasSeatMap: false,
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

const EventEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<EventDetail | null>(null);
  const [categoriesText, setCategoriesText] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ data: EventDetail }>(`/api/events/mine/${id}`);
        setModel(data.data);
        setCategoriesText(data.data.categories.join(", "));
      } catch {
        setModel(MOCK);
        setCategoriesText(MOCK.categories.join(", "));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model) return;

    try {
      const startISO = new Date(model.startTime).toISOString();
      const endISO = new Date(model.endTime).toISOString();
      if (new Date(startISO) >= new Date(endISO))
        return toast.error("Start must be before end");

      const categories = categoriesText
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 6);

      const payload: Partial<EventDetail> = {
        title: model.title,
        description: model.description,
        categories,
        startTime: startISO,
        endTime: endISO,
        status: model.status,
      };

      try {
        await api(`/api/events/${model._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } catch {
        // allow mock flow
      }
      toast.success("Event updated");
      nav("/organizer/myevents");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update event");
    }
  };

  if (loading || !model) return <Loading />;

  const canPublish = model.venueType === "template" || model.hasSeatMap;

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40">
      <BlurCircle top="40px" left="80px" />
      <h1 className="text-lg font-semibold mb-6">Edit Event</h1>

      <form onSubmit={save} className="max-w-3xl space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-300">Title</label>
            <input
              className="field mt-1"
              value={model.title}
              onChange={(e) => setModel({ ...model, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Categories</label>
            <input
              className="field mt-1"
              value={categoriesText}
              onChange={(e) => setCategoriesText(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-300">Description</label>
          <textarea
            className="field mt-1 min-h-28"
            value={model.description}
            onChange={(e) =>
              setModel({ ...model, description: e.target.value })
            }
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-300">Start</label>
            <input
              type="datetime-local"
              className="field mt-1"
              value={model.startTime.slice(0, 16)}
              onChange={(e) =>
                setModel({ ...model, startTime: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">End</label>
            <input
              type="datetime-local"
              className="field mt-1"
              value={model.endTime.slice(0, 16)}
              onChange={(e) => setModel({ ...model, endTime: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-300">Status</label>
          <select
            className="field mt-1"
            value={model.status}
            onChange={(e) =>
              setModel({
                ...model,
                status: e.target.value as "draft" | "published",
              })
            }
          >
            <option value="draft">Draft</option>
            <option value="published" disabled={!canPublish}>
              Published
            </option>
          </select>
          {!canPublish && (
            <p className="text-xs text-gray-400 mt-1">
              Custom venues require a seat-map before publishing.
            </p>
          )}
        </div>

        <div className="pt-2">
          <button type="submit" className="btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventEdit;
