/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
// *** UPDATED: Import useParams instead of useSearchParams ***
import { useParams, useNavigate } from "react-router-dom";
import { getVenueById, saveVenue, type Venue } from "./hooks/useVenues"; // Ensure correct path
import toast from "react-hot-toast";
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";
import MultiImageUploader from "../../components/admin/MultiImageUploader";

const emptyVenue: Venue = {
  name: "",
  address: "",
  capacity: 100,
  defaultLayoutType: "grid",
  description: "",
  images: [],
  isActive: true, // Default to active
};

const VenueEditor: React.FC = () => {
  const [venue, setVenue] = useState<Venue>(emptyVenue);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // *** UPDATED: Use useParams to get ID ***
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  useEffect(() => {
    // If there's an ID in the URL, fetch the venue
    if (id) {
      setLoading(true);
      getVenueById(id)
        .then((data) => setVenue(data))
        .catch((e) => toast.error(e.message || "Failed to load venue"))
        .finally(() => setLoading(false));
    } else {
      // If no ID, ensure we're using the empty form
      setVenue(emptyVenue);
    }
  }, [id]); // Effect triggers when ID (from URL) changes

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    > // Added HTMLSelectElement
  ) => {
    const { name, value, type } = e.target;

    // Handle checkbox
    if (type === "checkbox") {
      setVenue((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
      return;
    }

    setVenue((prev) => ({
      ...prev,
      // Handle number conversion for capacity
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // saveVenue logic already handles create (no id) vs update (with id)
      await saveVenue({ ...venue, _id: id });
      toast.success(`Venue ${id ? "updated" : "created"} successfully`);
      nav("/admin/venue-list"); // Navigate back to the list
    } catch (e: any) {
      toast.error(e.message || "Failed to save venue");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    // Base padding px-2 py-4
    <div className="relative px-2 py-4 sm:px-6 md:px-10 lg:px-16 overflow-x-hidden">
      <BlurCircle top="0" right="-100px" />
      <h1 className="text-base xs:text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
        {id ? "Edit Venue" : "Create Venue"}
      </h1>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl flex flex-col gap-3 sm:gap-4 border border-white/10 bg-white/5 backdrop-blur rounded-lg p-3 sm:p-4 md:p-6"
      >
        <label className="text-xs sm:text-sm font-medium">
          Name
          <input
            type="text"
            name="name"
            value={venue.name}
            onChange={handleChange}
            required
            className="w-full mt-1 p-2 rounded bg-black/20 border border-white/10 text-sm sm:text-base"
          />
        </label>

        <label className="text-xs sm:text-sm font-medium">
          Address
          <input
            type="text"
            name="address"
            value={venue.address}
            onChange={handleChange}
            required
            className="w-full mt-1 p-2 rounded bg-black/20 border border-white/10 text-sm sm:text-base"
          />
        </label>

        <label className="text-xs sm:text-sm font-medium">
          Capacity
          <input
            type="number"
            name="capacity"
            value={venue.capacity}
            onChange={handleChange}
            required
            min={1}
            className="w-full mt-1 p-2 rounded bg-black/20 border border-white/10 text-sm sm:text-base"
          />
        </label>

        <label className="text-xs sm:text-sm font-medium">
          Description
          <textarea
            name="description"
            value={venue.description || ""} // Handle potential undefined
            onChange={handleChange}
            className="w-full mt-1 p-2 rounded bg-black/20 border border-white/10 text-sm sm:text-base"
            rows={3}
          />
        </label>

        <MultiImageUploader
          label="Venue Images"
          values={venue.images || []}
          onChange={(urls) => {
            setVenue((prev) => ({ ...prev, images: urls }));
          }}
          endpoint="/api/admin/uploads/venue-images"
          uploadField="images"
        />

        {/* Added isActive toggle */}
        <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="isActive"
            checked={venue.isActive ?? true} // Default to checked
            onChange={handleChange}
            className="w-4 h-4 rounded bg-black/20 border-white/10"
          />
          Venue is Active
        </label>

        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-white px-6 py-2 rounded hover:bg-primary-dull transition disabled:opacity-50 mt-4 text-sm sm:text-base"
        >
          {saving ? "Saving..." : id ? "Update Venue" : "Create Venue"}
        </button>
      </form>
    </div>
  );
};

export default VenueEditor;
