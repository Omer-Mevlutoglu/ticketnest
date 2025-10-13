/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

export interface Venue {
  _id?: string;
  name: string;
  address: string;
  capacity: number;
  defaultLayoutType: "grid" | "freeform";
  description?: string;
  images?: string[];
  isActive?: boolean;
}

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchVenues(signal?: AbortSignal) {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/admin/venues`, {
        credentials: "include",
        signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const data: Venue[] = await res.json();
      setVenues(data);
    } catch (err: any) {
      if (err.name !== "AbortError") setError(err.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function deleteVenue(id: string) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/venues/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Venue deleted");
      setVenues((prev) => prev.filter((v) => v._id !== id));
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    fetchVenues(ac.signal);
    return () => ac.abort();
  }, []);

  return { venues, loading, error, refetch: () => fetchVenues(), deleteVenue };
}

export async function getVenueById(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/venues/${id}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Venue;
}

export async function saveVenue(data: Venue) {
  const method = data._id ? "PUT" : "POST";
  const url = data._id
    ? `${API_BASE}/api/admin/venues/${data._id}`
    : `${API_BASE}/api/admin/venues`;
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as Venue;
}
