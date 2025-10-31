/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast"; // <-- Import toast

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

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
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      credentials: "include",
      signal,
    });
    if (!res.ok) throw new Error(await res.text());
    const data: AdminUserRow[] = await res.json();
    setUsers(data);
  }

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        await fetchAll(ac.signal);
      } catch (e: any) {
        if (e?.name !== "AbortError")
          setError(e?.message || "Failed to load users");
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

      const res = await fetch(
        `${API_BASE}/api/admin/users/${userId}/set-approval`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isApproved }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success(
        isApproved ? "Organizer Approved" : "Organizer Approval Revoked"
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
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

      const res = await fetch(
        `${API_BASE}/api/admin/users/${userId}/${endpoint}`,
        {
          method: "PUT",
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error(await res.text());
      toast.success(isSuspended ? "User Suspended" : "User Unsuspended");
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
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
