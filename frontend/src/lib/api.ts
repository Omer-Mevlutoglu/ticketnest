// src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonInit = Omit<RequestInit, "body" | "credentials"> & { body?: any };

async function json<T>(path: string, init: JsonInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    method: init.method || "GET",
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  // some 204s have empty body
  if (res.status === 204) return null as unknown as T;
  return res.json() as Promise<T>;
}

/** ---------- Admin ---------- */
export const AdminAPI = {
  // Organizer approvals
  listPendingOrganizers: () =>
    json<
      Array<{
        _id: string;
        organizerId: {
          _id: string;
          username: string;
          email: string;
          role: string;
          isApproved: boolean;
        };
        status: "pending" | "approved" | "rejected";
        createdAt: string;
        updatedAt: string;
      }>
    >("/api/admin/organizers/pending"),

  approveOrganizer: (organizerId: string) =>
    json<{ message: string }>(`/api/admin/organizers/${organizerId}/approve`, {
      method: "PUT",
    }),

  rejectOrganizer: (organizerId: string) =>
    json<{ message: string }>(`/api/admin/organizers/${organizerId}/reject`, {
      method: "PUT",
    }),

  // Events (all)
  listEvents: () =>
    json<
      Array<{
        _id: string;
        title: string;
        status: "draft" | "published" | "archived";
        startTime: string;
        endTime: string;
        organizerId: string;
        venueType: "custom" | "template";
        venueName?: string;
        venueAddress?: string;
        templateVenueId?: string;
      }>
    >("/api/admin/events"),

  // Users
  listUsers: () =>
    json<
      Array<{
        _id: string;
        username: string;
        email: string;
        role: "attendee" | "organizer" | "admin";
        isApproved: boolean;
      }>
    >("/api/admin/users"),

  // Venues
  listVenues: () =>
    json<
      Array<{
        _id: string;
        name: string;
        address: string;
        capacity: number;
        description?: string;
        isActive: boolean;
        defaultLayoutType: "grid";
        defaultSeatMap?: Array<{
          x: number;
          y: number;
          tier: string;
          price: number;
        }>;
      }>
    >("/api/admin/venues"),

  createVenue: (body: {
    name: string;
    address: string;
    capacity: number;
    defaultLayoutType: "grid";
    description?: string;
    images?: string[];
    defaultSeatMap?: Array<{
      x: number;
      y: number;
      tier: string;
      price: number;
    }>;
  }) => json("/api/admin/venues", { method: "POST", body }),

  updateVenue: (
    id: string,
    body: Partial<{
      name: string;
      address: string;
      capacity: number;
      description?: string;
      images?: string[];
      defaultSeatMap?: Array<{
        x: number;
        y: number;
        tier: string;
        price: number;
      }>;
    }>
  ) => json(`/api/admin/venues/${id}`, { method: "PUT", body }),

  deleteVenue: (id: string) =>
    json(`/api/admin/venues/${id}`, { method: "DELETE" }),

  // ...existing methods

  uploadVenueImages: async (files: File[] | FileList): Promise<string[]> => {
    const fd = new FormData();
    Array.from(files as File[]).forEach((f) => fd.append("files", f));
    const res = await fetch(`${API_BASE}/api/uploads/venue`, {
      method: "POST",
      credentials: "include",
      body: fd, // no Content-Type header; browser sets multipart boundary
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json(); // { urls: string[] }
    return data.urls as string[];
  },
};
