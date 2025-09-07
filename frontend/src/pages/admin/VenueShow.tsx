/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import Title from "../../components/admin/Title";
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";
import { AdminAPI } from "../../lib/api";
import toast from "react-hot-toast";

type Venue = Awaited<ReturnType<typeof AdminAPI.listVenues>>[number];

const ABS = (path: string) =>
  (import.meta.env.VITE_API_BASE || "http://localhost:5000") + path;

const VenueShow: React.FC = () => {
  const [list, setList] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState<number>(200);
  const [description, setDescription] = useState("");

  // images (both URL mode and local upload)
  const [images, setImages] = useState<string[]>([]);
  const [imageURL, setImageURL] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.listVenues();
      setList(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load venues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addImageURL = () => {
    const url = imageURL.trim();
    if (!url) return;
    try {
      const u = new URL(url);
      if (!/^https?:/.test(u.protocol)) throw new Error("invalid");
      setImages((prev) => [...prev, url]);
      setImageURL("");
    } catch {
      toast.error("Enter a valid http/https image URL.");
    }
  };

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      setUploading(true);
      const urls = await AdminAPI.uploadVenueImages(files);
      // server returns relative paths (/uploads/venues/...)
      // store as absolute so preview works regardless of base URL:
      setImages((prev) => [...prev, ...urls.map(ABS)]);
      toast.success(
        `Uploaded ${urls.length} image${urls.length > 1 ? "s" : ""}`
      );
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = ""; // allow picking same files again if needed
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await AdminAPI.createVenue({
        name,
        address,
        capacity,
        description,
        defaultLayoutType: "grid",
        images, // includes absolute URLs (local uploads + manual URLs)
        defaultSeatMap: [],
      });
      toast.success("Venue created");
      setName("");
      setAddress("");
      setCapacity(200);
      setDescription("");
      setImages([]);
      setImageURL("");
      load();
    } catch (e: any) {
      toast.error(e.message || "Create failed");
    }
  };

  const update = async (v: Venue, patch: Partial<Venue>) => {
    try {
      await AdminAPI.updateVenue(v._id, patch as any);
      toast.success("Venue updated");
      load();
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete venue?")) return;
    try {
      await AdminAPI.deleteVenue(id);
      toast.success("Venue deleted");
      setList((prev) => prev.filter((v) => v._id !== id));
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  return loading ? (
    <Loading />
  ) : (
    <>
      <Title text1="Manage" text2="Venues" />
      <div className="relative mt-6">
        <BlurCircle top="-60px" left="-80px" />

        {/* Create form */}
        <form
          onSubmit={create}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-3xl"
        >
          <div>
            <label className="text-sm text-gray-300">Name</label>
            <input
              className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Address</label>
            <input
              className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Capacity</label>
            <input
              type="number"
              min={1}
              className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value) || 0)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-300">Description</label>
            <textarea
              rows={2}
              className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Images: Upload from PC */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm text-gray-300">Images</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="cursor-pointer px-3 py-2 rounded-md bg-white/10 hover:bg-white/20">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onPickFiles}
                  className="hidden"
                />
                {uploading ? "Uploading…" : "Upload from computer"}
              </label>

              {/* Optional: also allow URL paste */}
              <div className="flex gap-2">
                <input
                  placeholder="https://…"
                  className="w-64 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
                  value={imageURL}
                  onChange={(e) => setImageURL(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addImageURL}
                  className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20"
                >
                  Add URL
                </button>
              </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                {images.map((url, idx) => (
                  <div
                    key={url + idx}
                    className="relative border border-white/10 rounded-lg overflow-hidden"
                  >
                    <img
                      src={url}
                      alt={`Venue image ${idx + 1}`}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute top-1 right-1 flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(idx, -1)}
                        className="px-2 py-1 text-xs rounded bg-black/50 hover:bg-black/70"
                        disabled={idx === 0}
                        title="Move left"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, +1)}
                        className="px-2 py-1 text-xs rounded bg-black/50 hover:bg-black/70"
                        disabled={idx === images.length - 1}
                        title="Move right"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="px-2 py-1 text-xs rounded bg-rose-600/80 hover:bg-rose-600 text-white"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <button className="px-4 py-2 rounded-md bg-primary hover:bg-primary-dull transition">
              Create Venue
            </button>
          </div>
        </form>

        {/* List */}
        <div className="mt-8 max-w-5xl overflow-x-auto">
          <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
            <thead>
              <tr className="bg-primary/20 text-left text-white">
                <th className="p-2 font-medium pl-15">Name</th>
                <th className="p-2 font-medium">Address</th>
                <th className="p-2 font-medium">Capacity</th>
                <th className="p-2 font-medium">Active</th>
                <th className="p-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm font-light">
              {list.map((v) => (
                <tr
                  key={v._id}
                  className="border-b border-primary/10 bg-primary/5 even:bg-primary/10"
                >
                  <td className="p-2">{v.name}</td>
                  <td className="p-2">{v.address}</td>
                  <td className="p-2">{v.capacity}</td>
                  <td className="p-2">{v.isActive ? "Yes" : "No"}</td>
                  <td className="p-2 space-x-2">
                    <button
                      onClick={() =>
                        update(v, { isActive: !v.isActive } as any)
                      }
                      className="px-3 py-1 rounded-md bg-white/10 hover:bg-white/20"
                    >
                      {v.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => del(v._id)}
                      className="px-3 py-1 rounded-md bg-rose-600/80 hover:bg-rose-600 text-white"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-400" colSpan={5}>
                    No venues yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default VenueShow;
