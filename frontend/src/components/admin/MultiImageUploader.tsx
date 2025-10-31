/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/admin/MultiImageUploader.tsx
import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import { UploadCloudIcon, XIcon, Loader2Icon } from "lucide-react";

const API_BASE =
  (import.meta as any).env.VITE_API_BASE || "http://localhost:5000";

type Props = {
  label: string;
  values: string[]; // An array of image URLs
  onChange: (urls: string[]) => void; // Updates the parent's URL array
  endpoint: string; // The API endpoint
  uploadField?: string; // The FormData field name (e.g., "images")
};

const MultiImageUploader: React.FC<Props> = ({
  label,
  values,
  onChange,
  endpoint,
  uploadField = "images",
}) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append(uploadField, files[i]);
    }

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

      // Add new URLs to the existing list
      onChange([...values, ...data.urls]);
      toast.success(`${data.urls.length} image(s) uploaded!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload images.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (indexToRemove: number) => {
    onChange(values.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div>
      <label className="text-xs sm:text-sm font-medium block mb-2">
        {label}
      </label>

      {/* 1. List of Uploaded Images */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-2">
        {values.map((url, index) => (
          <div key={index} className="relative aspect-video">
            <img
              src={url}
              alt={`Venue ${index + 1}`}
              className="w-full h-full object-cover rounded-md border border-white/10"
            />
            <button
              type="button"
              onClick={() => removeImage(index)}
              disabled={uploading}
              className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full hover:bg-red-500/80 transition disabled:opacity-50"
              aria-label="Remove image"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* 2. Uploader Dropzone */}
      <div
        className={`relative w-full border-2 border-dashed border-white/20 rounded-md p-6 text-center transition ${
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
          multiple // Allow multiple files
        />
        {uploading ? (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <Loader2Icon className="w-8 h-8 animate-spin mb-2" />
            <span className="text-sm font-medium">Uploading...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <UploadCloudIcon className="w-8 h-8 mb-2" />
            <span className="text-sm font-medium">Click to upload images</span>
            <span className="text-xs mt-1">
              PNG, JPG, or WEBP (Max 10MB each)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiImageUploader;
