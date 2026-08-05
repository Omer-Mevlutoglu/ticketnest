 
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast"; // <-- Import toast
import { apiGet, apiPut, errorMessage, isAbortError } from "../../../lib/api";


export type Role = "attendee" | "organizer" | "admin";

export type AdminUserRow = {
  _id: string;
  email: string;
  username?: string;
  role: Role;
  isApproved?: boolean; // organizers only
  isSuspended?: boolean; // <-- ADDED THIS
  createdAt?: string;
  updatedAt?: string;
};

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null); // <-- ADDED THIS

  // client-side filters
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "all">("all");

  async function fetchAll(signal?: AbortSignal) {
    setError(null);
    const data = await apiGet<AdminUserRow[]>(`/api/admin/users`, signal);
    setUsers(data);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        await fetchAll(ac.signal);
      } catch (e) {
        if (!isAbortError(e))
          setError(errorMessage(e, "Failed to load users"));
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = role === "all" ? true : u.role === role;
      const matchesQuery =
        !q ||
        u.email?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u._id?.toLowerCase().includes(q);
      return matchesRole && matchesQuery;
    });
  }, [users, query, role]);

  // --- NEW: Function to set approval status ---
  async function setApprovalStatus(userId: string, isApproved: boolean) {
    setBusyId(userId);
    const originalUsers = [...users];
    try {
      // Optimistic update
      setUsers((currentUsers) =>
        currentUsers.map((u) => (u._id === userId ? { ...u, isApproved } : u))
      );

      await apiPut(`/api/admin/users/${userId}/set-approval`, { isApproved });
      toast.success(
        isApproved ? "Organizer Approved" : "Organizer Approval Revoked"
      );
    } catch (e) {
      toast.error(errorMessage(e, "Failed to update status"));
      setUsers(originalUsers); // Revert on failure
    } finally {
      setBusyId(null);
    }
  }

  // --- NEW: Function to toggle suspend status ---
  async function toggleSuspension(userId: string, isSuspended: boolean) {
    setBusyId(userId);
    const originalUsers = [...users];
    const endpoint = isSuspended ? "suspend" : "unsuspend";
    try {
      // Optimistic update
      setUsers((currentUsers) =>
        currentUsers.map((u) => (u._id === userId ? { ...u, isSuspended } : u))
      );

      await apiPut(`/api/admin/users/${userId}/${endpoint}`);
      toast.success(isSuspended ? "User Suspended" : "User Unsuspended");
    } catch (e) {
      toast.error(errorMessage(e, "Failed to update status"));
      setUsers(originalUsers); // Revert on failure
    } finally {
      setBusyId(null);
    }
  }

  return {
    loading,
    error,
    users: filtered,
    rawUsers: users,
    query,
    setQuery,
    role,
    setRole,
    refetch: () => fetchAll().catch(() => {}),
    // --- NEW: Expose functions and state ---
    busyId,
    setApprovalStatus,
    toggleSuspension,
  };
}
