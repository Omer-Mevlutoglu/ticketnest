 
// src/admin/hooks/useApprovalRequests.ts
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiGet, apiPut, errorMessage, isAbortError } from "../../../lib/api";


// ✅ match your backend
const LIST_URL = `/api/admin/organizers/pending`; // GET
const APPROVE_URL = (organizerId: string) =>
  `/api/admin/organizers/${organizerId}/approve`; // PUT
const REJECT_URL = (organizerId: string) =>
  `/api/admin/organizers/${organizerId}/reject`; // PUT

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
    const rows = await apiGet<ApprovalRequest[]>(LIST_URL, signal);
    setData(rows);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        await fetchPending(ac.signal);
      } catch (e) {
        if (!isAbortError(e)) {
          setError(errorMessage(e, "Failed to load approval requests"));
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
      await apiPut(APPROVE_URL(organizerId));
      toast.success("Organizer approved");
    } catch (e) {
      setData(prev);
      toast.error(errorMessage(e, "Failed to approve"));
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
      await apiPut(REJECT_URL(organizerId));
      toast("Request rejected");
    } catch (e) {
      setData(prev);
      toast.error(errorMessage(e, "Failed to reject"));
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
