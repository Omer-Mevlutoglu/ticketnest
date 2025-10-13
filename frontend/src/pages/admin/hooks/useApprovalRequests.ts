/* eslint-disable @typescript-eslint/no-explicit-any */
// src/admin/hooks/useApprovalRequests.ts
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

// ✅ match your backend
const LIST_URL = `${API_BASE}/api/admin/organizers/pending`; // GET
const APPROVE_URL = (organizerId: string) =>
  `${API_BASE}/api/admin/organizers/${organizerId}/approve`; // PUT
const REJECT_URL = (organizerId: string) =>
  `${API_BASE}/api/admin/organizers/${organizerId}/reject`; // PUT

export type PopulatedOrganizer = {
  _id: string;
  username?: string;
  email: string;
  role: "organizer" | "attendee" | "admin";
  isApproved?: boolean;
};

export type ApprovalRequest = {
  _id: string;
  organizerId: PopulatedOrganizer; // populated by the API
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  updatedAt?: string;
};

export function useApprovalRequests() {
  const [data, setData] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchPending(signal?: AbortSignal) {
    setError(null);
    const res = await fetch(LIST_URL, {
      credentials: "include",
      signal,
    });
    if (!res.ok) throw new Error(await res.text());
    const rows: ApprovalRequest[] = await res.json();
    setData(rows);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        await fetchPending(ac.signal);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          setError(e?.message || "Failed to load approval requests");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const pendingCount = useMemo(
    () => data.filter((r) => r.status === "pending").length,
    [data]
  );

  async function approve(organizerId: string) {
    setBusyId(organizerId);
    const prev = data;
    try {
      // optimistic update
      setData((rows) => rows.filter((r) => r.organizerId._id !== organizerId));
      const res = await fetch(APPROVE_URL(organizerId), {
        method: "PUT", // ✅ verb fix
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Organizer approved");
    } catch (e: any) {
      setData(prev);
      toast.error(e?.message || "Failed to approve");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(organizerId: string) {
    setBusyId(organizerId);
    const prev = data;
    try {
      // optimistic update
      setData((rows) => rows.filter((r) => r.organizerId._id !== organizerId));
      const res = await fetch(REJECT_URL(organizerId), {
        method: "PUT", // ✅ verb fix
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      toast("Request rejected");
    } catch (e: any) {
      setData(prev);
      toast.error(e?.message || "Failed to reject");
    } finally {
      setBusyId(null);
    }
  }

  return {
    data,
    loading,
    error,
    pendingCount,
    approve,
    reject,
    busyId,
    refetch: () => fetchPending().catch(() => {}),
  };
}
