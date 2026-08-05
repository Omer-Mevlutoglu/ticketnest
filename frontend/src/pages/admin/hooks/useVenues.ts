 
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { apiDelete, apiGet, apiPost, apiPut, errorMessage, isAbortError } from "../../../lib/api";


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
      const data = await apiGet<Venue[]>(`/api/admin/venues`, signal);
      setVenues(data);
    } catch (err) {
      if (!isAbortError(err)) setError(errorMessage(err, "Failed to load"));
    } finally {
      setLoading(false);
    }
  }

  async function deleteVenue(id: string) {
    try {
      await apiDelete(`/api/admin/venues/${id}`);
      toast.success("Venue deleted");
      setVenues((prev) => prev.filter((v) => v._id !== id));
    } catch (e) {
      toast.error(errorMessage(e, "Failed to delete"));
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
  return apiGet<Venue>(`/api/admin/venues/${id}`);
}

export async function saveVenue(data: Venue) {
  // Update when the venue already exists, create otherwise.
  return data._id
    ? apiPut<Venue>(`/api/admin/venues/${data._id}`, data)
    : apiPost<Venue>("/api/admin/venues", data);
}
