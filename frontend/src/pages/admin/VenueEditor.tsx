/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getVenueById, saveVenue, type Venue } from "./hooks/useVenues";
import toast from "react-hot-toast";
import MultiImageUploader from "../../components/admin/MultiImageUploader";
import { Grid3X3Icon } from "lucide-react";
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";

type Seat = {
  x: number;
  y: number;
  tier: string;
  price: number;
  status: "available" | "reserved" | "sold";
};

interface VenueWithMap extends Venue {
  defaultSeatMap?: Seat[];
}

const emptyVenue: VenueWithMap = {
  name: "",
  address: "",
  capacity: 100,
  defaultLayoutType: "grid",
  description: "",
  images: [],
  isActive: true,
  defaultSeatMap: [],
};

const VenueEditor: React.FC = () => {
  const [venue, setVenue] = useState<VenueWithMap>(emptyVenue);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  const [tier, setTier] = useState("Standard");
  const [price, setPrice] = useState(50);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getVenueById(id)
        .then((data) => {
          const v = data as VenueWithMap;
          setVenue(v);

          // Try to infer rows/cols if map exists, otherwise default
          if (v.defaultSeatMap && v.defaultSeatMap.length > 0) {
            // Simple heuristic for grid dimensions
            const maxR = Math.max(...v.defaultSeatMap.map((s) => s.x));
            const maxC = Math.max(...v.defaultSeatMap.map((s) => s.y));
            setRows(maxR);
            setCols(maxC);
            if (v.defaultSeatMap[0]) {
              setTier(v.defaultSeatMap[0].tier);
              setPrice(v.defaultSeatMap[0].price);
            }
          }
        })
        .catch((e) => toast.error(e.message || "Failed to load venue"))
        .finally(() => setLoading(false));
    } else {
      // If no ID, ensure we're using the empty form
      setVenue(emptyVenue);
    }
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      setVenue((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
      return;
    }

    setVenue((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const generateDefaultMap = () => {
    if (rows < 1 || cols < 1) return toast.error("Invalid dimensions");

    const newSeats: Seat[] = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        newSeats.push({
          x: r,
          y: c,
          tier,
          price,
          status: "available",
        });
      }
    }

    setVenue((prev) => ({
      ...prev,
      defaultSeatMap: newSeats,
      capacity: newSeats.length,
    }));

    toast.success(`Generated ${newSeats.length} seats. Capacity updated.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveVenue({ ...venue, _id: id });
      toast.success(`Venue ${id ? "updated" : "created"} successfully`);
      nav("/admin/venue-list");
    } catch (e: any) {
      toast.error(e.message || "Failed to save venue");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="relative px-2 py-4 sm:px-6 md:px-10 lg:px-16 overflow-x-hidden">
      <BlurCircle top="0" right="-100px" />
      <h1 className="text-base xs:text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
        {id ? "Edit Venue" : "Create Venue"}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Venue Details */}
        <form
          id="venue-form"
          onSubmit={handleSubmit}
          className="lg:col-span-2 flex flex-col gap-3 sm:gap-4 border border-white/10 bg-white/5 backdrop-blur rounded-lg p-3 sm:p-4 md:p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <label className="text-xs sm:text-sm font-medium">
            Description
            <textarea
              name="description"
              value={venue.description || ""}
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

          <label className="text-sm font-medium flex items-center gap-2 cursor-pointer mt-2">
            <input
              type="checkbox"
              name="isActive"
              checked={venue.isActive ?? true}
              onChange={handleChange}
              className="w-4 h-4 rounded bg-black/20 border-white/10"
            />
            Venue is Active
          </label>
        </form>

        {/* Right Column: Seat Map Generator */}
        <div className="flex flex-col gap-4">
          <div className="border border-white/10 bg-white/5 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3 text-primary">
              <Grid3X3Icon className="w-5 h-5" />
              <h3 className="font-semibold text-sm sm:text-base">
                Default Layout
              </h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Define a default grid. Organizers using this template will get
              this map automatically.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Rows</label>
                <input
                  type="number"
                  min={1}
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value))}
                  className="w-full p-2 rounded bg-black/20 border border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Cols</label>
                <input
                  type="number"
                  min={1}
                  value={cols}
                  onChange={(e) => setCols(Number(e.target.value))}
                  className="w-full p-2 rounded bg-black/20 border border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Def. Tier
                </label>
                <input
                  type="text"
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className="w-full p-2 rounded bg-black/20 border border-white/10 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Def. Price
                </label>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full p-2 rounded bg-black/20 border border-white/10 text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={generateDefaultMap}
              className="w-full py-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded text-xs transition"
            >
              Generate / Reset Map
            </button>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total Capacity</span>
                <span className="text-xl font-bold text-emerald-400">
                  {venue.capacity}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 text-right">
                {venue.defaultSeatMap?.length || 0} seats defined
              </p>
            </div>
          </div>

          <button
            type="submit"
            form="venue-form"
            disabled={saving}
            className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dull transition disabled:opacity-50 text-sm sm:text-base font-semibold shadow-lg shadow-primary/20"
          >
            {saving ? "Saving..." : id ? "Update Venue" : "Create Venue"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VenueEditor;
