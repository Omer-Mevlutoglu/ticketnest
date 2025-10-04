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
  if (res.status === 204) return null as unknown as T; // handle empty body
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

  // Venues (admin CRUD)
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

  // File upload (if you wired /api/uploads/venue)
  uploadVenueImages: async (files: File[] | FileList): Promise<string[]> => {
    const fd = new FormData();
    Array.from(files as File[]).forEach((f) => fd.append("files", f));
    const res = await fetch(`${API_BASE}/api/uploads/venue`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json(); // { urls: string[] }
    return data.urls as string[];
  },
};

/** ---------- Public Venues (read) ---------- */
export const VenueAPI = {
  listActive: () =>
    json<
      Array<{
        _id: string;
        name: string;
        address: string;
        capacity: number;
        description?: string;
        images?: string[];
        defaultLayoutType: "grid";
        defaultSeatMap?: Array<{
          x: number;
          y: number;
          tier: string;
          price: number;
        }>;
        isActive: boolean;
      }>
    >("/api/venues"),
};

/** ---------- Organizer ---------- */
export type CreateEventDTO = {
  title: string;
  description: string;
  categories: string[];
  status: "draft" | "published" | "archived";
  venueType: "custom" | "template";
  templateVenueId?: string;
  venueName?: string;
  venueAddress?: string;
  startTime: string; // ISO
  endTime: string; // ISO
};

export const OrganizerAPI = {
  myEvents: () =>
    json<
      Array<{
        _id: string;
        title: string;
        description: string;
        categories: string[];
        status: "draft" | "published" | "archived";
        organizerId: string;
        venueType: "custom" | "template";
        templateVenueId?: string;
        venueName?: string;
        venueAddress?: string;
        startTime: string;
        endTime: string;
      }>
    >("/api/events/mine"),

  createEvent: (dto: CreateEventDTO) =>
    json("/api/events", { method: "POST", body: dto }),

  updateEvent: (id: string, patch: Partial<CreateEventDTO>) =>
    json(`/api/events/${id}`, { method: "PUT", body: patch }),

  deleteEvent: (id: string) => json(`/api/events/${id}`, { method: "DELETE" }),

  // Seat map
  getSeatMap: (eventId: string) => json(`/api/events/${eventId}/seatmap`),

  upsertSeatMap: (
    eventId: string,
    seats: Array<{
      x: number;
      y: number;
      tier: string;
      price: number;
      status: "available";
    }>
  ) =>
    json(`/api/events/${eventId}/seatmap`, { method: "PUT", body: { seats } }),

  generateSeatMapFromSpec: (
    eventId: string,
    spec: {
      rows: number;
      cols: number;
      default: { tier: string; price: number };
      rules?: Array<{ rows: number[]; tier: string; price: number }>;
      blockedSeats?: Array<{ x: number; y: number }>;
    }
  ) =>
    json(`/api/events/${eventId}/seatmap/generate`, {
      method: "POST",
      body: spec,
    }),
};
