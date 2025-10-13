import { useEffect, useMemo, useState } from "react";

const API_BASE =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:5000";

export type Role = "attendee" | "organizer" | "admin";

export type AdminUserRow = {
  _id: string;
  email: string;
  username?: string;
  role: Role;
  isApproved?: boolean;   // organizers only
  createdAt?: string;     // if your model timestamps are on
  updatedAt?: string;
};

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        if (e?.name !== "AbortError") setError(e?.message || "Failed to load users");
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
        (u.email?.toLowerCase().includes(q)) ||
        (u.username?.toLowerCase().includes(q)) ||
        (u._id?.toLowerCase().includes(q));
      return matchesRole && matchesQuery;
    });
  }, [users, query, role]);

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
  };
}
