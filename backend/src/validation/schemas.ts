import { Types } from "mongoose";
import { z } from "zod";
import { MAX_SEATS_PER_BOOKING } from "../services/bookingService";

/**
 * Request schemas.
 *
 * One definition per shape, giving both the runtime check and the TypeScript
 * type — so the two cannot drift the way a hand-written validator plus a
 * separate interface always eventually do.
 *
 * Every object is `.strict()`: an unexpected key is a 400, not something
 * silently forwarded into a Mongoose query. That is what closes the door on
 * operator injection (`{"email": {"$ne": null}}`) and on clients trying to set
 * fields the server owns, like `status` or `organizerId`.
 */

/** A MongoDB ObjectId in string form. */
export const objectId = z
  .string()
  .refine((v) => Types.ObjectId.isValid(v), "Invalid ID");

const trimmed = (max: number) => z.string().trim().min(1).max(max);

// --- auth ---------------------------------------------------------------

export const registerSchema = z
  .object({
    username: trimmed(50),
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    // Kept at 6 to match the existing rule. Raising it is a product decision
    // (see D5), not a refactor.
    password: z.string().min(6, "Password must be at least 6 characters").max(200),
    role: z.enum(["attendee", "organizer"]),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
    password: z.string().min(1, "Password is required").max(200),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(6, "Password must be at least 6 characters").max(200),
  })
  .strict();

export const verifyEmailSchema = z
  .object({ token: z.string().min(1, "Token is required") })
  .strict();

export const resendVerificationSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Invalid email address"),
  })
  .strict();

// --- events -------------------------------------------------------------

const eventBase = {
  title: trimmed(200),
  description: trimmed(5000),
  categories: z.array(trimmed(30)).max(20).default([]),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  venueType: z.enum(["custom", "template"]),
  templateVenueId: objectId.optional(),
  venueName: trimmed(200).optional(),
  venueAddress: trimmed(300).optional(),
  poster: z.string().url().max(2000).optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
};

// `organizerId` is deliberately absent: it comes from the session, never the
// body, so a client cannot create an event owned by somebody else.
export const createEventSchema = z
  .object(eventBase)
  .strict()
  .refine((e) => e.startTime < e.endTime, {
    message: "Event startTime must be before endTime",
    path: ["endTime"],
  })
  .refine((e) => e.venueType !== "template" || !!e.templateVenueId, {
    message: "templateVenueId is required for template venues",
    path: ["templateVenueId"],
  })
  .refine(
    (e) => e.venueType !== "custom" || (!!e.venueName && !!e.venueAddress),
    {
      message: "venueName and venueAddress are required for custom venues",
      path: ["venueName"],
    }
  );

export const updateEventSchema = z
  .object({
    title: eventBase.title.optional(),
    description: eventBase.description.optional(),
    categories: z.array(trimmed(30)).max(20).optional(),
    status: z.enum(["draft", "published", "archived"]).optional(),
    venueType: z.enum(["custom", "template"]).optional(),
    venueName: trimmed(200).optional(),
    venueAddress: trimmed(300).optional(),
    poster: z.string().url().max(2000).optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
  })
  .strict()
  .refine((e) => !e.startTime || !e.endTime || e.startTime < e.endTime, {
    message: "Event startTime must be before endTime",
    path: ["endTime"],
  });

// --- seat maps ----------------------------------------------------------

const coordinate = z.number().int().min(0).max(500);

export const seatCoordsSchema = z
  .object({ x: coordinate, y: coordinate })
  .strict();

const seatSchema = z
  .object({
    x: coordinate,
    y: coordinate,
    tier: trimmed(50),
    price: z.number().min(0).max(1_000_000),
    // Clients supply layout, never live state — a seat cannot be posted in as
    // already sold.
    status: z.literal("available").optional(),
  })
  .strict();

export const upsertSeatMapSchema = z
  .object({
    layoutType: z.literal("grid").optional(),
    seats: z.array(seatSchema).min(1).max(40_000),
  })
  .strict()
  .refine(
    (m) => new Set(m.seats.map((s) => `${s.x},${s.y}`)).size === m.seats.length,
    { message: "Seat coordinates must be unique within a map", path: ["seats"] }
  );

export const generateSeatMapSchema = z
  .object({
    rows: z.number().int().min(1).max(200),
    cols: z.number().int().min(1).max(200),
    tiers: z
      .array(
        z
          .object({
            name: trimmed(50),
            price: z.number().min(0).max(1_000_000),
            fromRow: z.number().int().min(1).optional(),
            toRow: z.number().int().min(1).optional(),
          })
          .strict()
      )
      .min(1)
      .max(20),
    blockedSeats: z.array(seatCoordsSchema).max(40_000).optional(),
  })
  .strict();

// --- bookings -----------------------------------------------------------

export const createBookingSchema = z
  .object({
    eventId: objectId,
    // The same limit the service enforces; rejecting here means an oversized
    // request never reaches a transaction.
    seats: z.array(seatCoordsSchema).min(1).max(MAX_SEATS_PER_BOOKING * 4),
  })
  .strict();

// --- shared -------------------------------------------------------------

export const idParamSchema = z.object({ id: objectId }).strict();

export const eventIdParamSchema = z.object({ eventId: objectId }).strict();

/** `?page=&limit=`, capped so one request cannot ask for the whole table. */
export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

/** The admin booking list also filters by status. */
export const adminBookingQuerySchema = paginationSchema.extend({
  status: z.enum(["unpaid", "paid", "failed", "expired", "refunded"]).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type GenerateSeatMapInput = z.infer<typeof generateSeatMapSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type AdminBookingQueryInput = z.infer<typeof adminBookingQuerySchema>;
