import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getVenueById, saveVenue, type Venue } from "./hooks/useVenues.ts";
import toast from "react-hot-toast";
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";

const emptyVenue: Venue = {
  name: "",
  address: "",
  capacity: 100,
  defaultLayoutType: "grid",
  description: "",
  images: [],
};

const VenueEditor: React.FC = () => {
  const [venue, setVenue] = useState<Venue>(emptyVenue);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [params] = useSearchParams();
  const nav = useNavigate();

  const id = params.get("id");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getVenueById(id)
      .then((data) => setVenue(data))
      .catch((e) => toast.error(e.message || "Failed to load venue"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setVenue((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveVenue({ ...venue, _id: id || undefined });
      toast.success(`Venue ${id ? "updated" : "created"} successfully`);
      nav("/admin/venue-list");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast.error(e.message || "Failed to save venue");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="relative px-6 md:px-10 lg:px-16 pt-8 pb-16">
      <BlurCircle top="0" right="-100px" />
      <h1 className="text-lg font-semibold mb-6">
        {id ? "Edit Venue" : "Create Venue"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl flex flex-col gap-4 border border-white/10 bg-white/5 backdrop-blur rounded-lg p-6"
      >
        <label className="text-sm font-medium">
          Name
          <input
            type="text"
            name="name"
            value={venue.name}
            onChange={handleChange}
            required
            className="w-full mt-1 p-2 rounded bg-black/20 border border-white/10"
          />
        </label>

        <label className="text-sm font-medium">
          Address
          <input
            type="text"
            name="address"
            value={venue.address}
            onChange={handleChange}
            required
            className="w-full mt-1 p-2 rounded bg-black/20 border border-white/10"
          />
        </label>

        <label className="text-sm font-medium">
          Capacity
          <input
            type="number"
            name="capacity"
            value={venue.capacity}
            onChange={handleChange}
            required
            min={1}
            className="w-full mt-1 p-2 rounded bg-black/20 border border-white/10"
          />
        </label>

        <label className="text-sm font-medium">
          Description
          <textarea
            name="description"
            value={venue.description}
            onChange={handleChange}
            className="w-full mt-1 p-2 rounded bg-black/20 border border-white/10"
            rows={3}
          />
        </label>

        <label className="text-sm font-medium">
          Image URLs (comma separated)
          <input
            type="text"
            name="images"
            value={venue.images?.join(", ") || ""}
            onChange={(e) =>
              setVenue((prev) => ({
                ...prev,
                images: e.target.value.split(",").map((s) => s.trim()),
              }))
            }
            className="w-full mt-1 p-2 rounded bg-black/20 border border-white/10"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-white px-6 py-2 rounded hover:bg-primary/90 transition disabled:opacity-50 mt-4"
        >
          {saving ? "Saving..." : id ? "Update Venue" : "Create Venue"}
        </button>
      </form>
    </div>
  );
};

export default VenueEditor;
