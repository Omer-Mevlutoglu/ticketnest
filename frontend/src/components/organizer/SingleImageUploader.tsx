/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/organizer/SingleImageUploader.tsx
import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import { UploadCloudIcon, XIcon, Loader2Icon } from "lucide-react";

const API_BASE =
  (import.meta as any).env.VITE_API_BASE || "http://localhost:5000";

type Props = {
  label: string;
  value: string; // The current image URL
  onChange: (url: string) => void; // Function to update the parent's URL state
  endpoint: string; // The API endpoint to upload to
  uploadField?: string; // The FormData field name (e.g., "poster")
};

const SingleImageUploader: React.FC<Props> = ({
  label,
  value,
  onChange,
  endpoint,
  uploadField = "poster",
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append(uploadField, file);

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Upload failed");
      }

      onChange(data.url); // Update parent state with the new URL
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image.");
    } finally {
      setUploading(false);
      // Clear input value to allow re-uploading the same file
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearImage = () => {
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      {value ? (
        // 1. Preview State (Image URL exists)
        <div className="relative w-full max-w-sm">
          <img
            src={value} // Cloudinary URLs are absolute
            alt="Preview"
            className="w-full h-auto object-cover rounded-md border border-white/10"
          />
          <button
            type="button"
            onClick={clearImage}
            disabled={uploading}
            className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500/80 transition disabled:opacity-50"
            aria-label="Remove image"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // 2. Empty / Uploading State
        <div
          className={`relative w-full max-w-sm border-2 border-dashed border-white/20 rounded-md p-6 text-center transition ${
            uploading ? "opacity-50" : "hover:border-primary/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {uploading ? (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <Loader2Icon className="w-8 h-8 animate-spin mb-2" />
              <span className="text-sm font-medium">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-400">
              <UploadCloudIcon className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">
                Click to upload poster
              </span>
              <span className="text-xs mt-1">PNG, JPG, or WEBP (Max 10MB)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SingleImageUploader;
