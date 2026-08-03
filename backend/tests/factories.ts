import { Types } from "mongoose";
import userModel, { IUser } from "../src/models/userModel";
import { eventModel, IEvent } from "../src/models/eventModel";
import SeatMapModel, { ISeat, ISeatMap } from "../src/models/seatMapModel";
import BookingModel, { IBooking, IBookingItem } from "../src/models/bookingModel";
import { hashPassword } from "../src/utils/helperHash";

/**
 * Factories for integration tests.
 *
 * Every factory takes an overrides object and fills the rest with valid
 * defaults, so a test only states the fields it actually cares about.
 */

let counter = 0;
const unique = () => `${Date.now().toString(36)}-${++counter}`;

export const DEFAULT_PASSWORD = "Password123";

export interface CreateUserOptions {
  username?: string;
  email?: string;
  password?: string;
  role?: "attendee" | "organizer" | "admin";
  emailVerified?: boolean;
  isApproved?: boolean;
  isSuspended?: boolean;
}

/** Creates a login-ready user. Returns the document plus its plaintext password. */
export const createUser = async (
  overrides: CreateUserOptions = {}
): Promise<{ user: IUser; password: string }> => {
  const id = unique();
  const password = overrides.password ?? DEFAULT_PASSWORD;

  const user = await userModel.create({
    username: overrides.username ?? `user-${id}`,
    email: overrides.email ?? `user-${id}@example.test`,
    passwordHash: await hashPassword(password),
    role: overrides.role ?? "attendee",
    emailVerified: overrides.emailVerified ?? true,
    isApproved: overrides.isApproved ?? true,
    isSuspended: overrides.isSuspended ?? false,
  });

  return { user, password };
};

export const createAttendee = (overrides: CreateUserOptions = {}) =>
  createUser({ ...overrides, role: "attendee" });

export const createOrganizer = (overrides: CreateUserOptions = {}) =>
  createUser({ ...overrides, role: "organizer" });

export const createAdmin = (overrides: CreateUserOptions = {}) =>
  createUser({ ...overrides, role: "admin", isApproved: true });

export interface CreateEventOptions {
  organizerId?: Types.ObjectId;
  title?: string;
  status?: "draft" | "published" | "archived";
  isCancelled?: boolean;
  startTime?: Date;
  endTime?: Date;
}

/** Creates a published, custom-venue event. Seeds an organizer if none given. */
export const createEvent = async (
  overrides: CreateEventOptions = {}
): Promise<IEvent> => {
  const id = unique();

  let organizerId = overrides.organizerId;
  if (!organizerId) {
    const { user } = await createOrganizer();
    organizerId = user._id as Types.ObjectId;
  }

  const startTime = overrides.startTime ?? new Date(Date.now() + 7 * 86_400_000);

  return eventModel.create({
    title: overrides.title ?? `Event ${id}`,
    description: "Created by the integration test factory.",
    categories: ["test"],
    status: overrides.status ?? "published",
    organizerId,
    venueType: "custom",
    venueName: "Test Arena",
    venueAddress: "1 Test Street",
    startTime,
    endTime: overrides.endTime ?? new Date(startTime.getTime() + 3 * 3_600_000),
    isCancelled: overrides.isCancelled ?? false,
  });
};

export interface CreateSeatMapOptions {
  eventId: Types.ObjectId;
  rows?: number;
  cols?: number;
  price?: number;
  seats?: ISeat[];
}

/** Creates a rows x cols grid of available seats, or the exact seats given. */
export const createSeatMap = async ({
  eventId,
  rows = 2,
  cols = 2,
  price = 100,
  seats,
}: CreateSeatMapOptions): Promise<ISeatMap> => {
  const grid: ISeat[] =
    seats ??
    Array.from({ length: rows }, (_, y) =>
      Array.from({ length: cols }, (_, x) => ({
        x,
        y,
        tier: "standard",
        price,
        status: "available" as const,
      }))
    ).flat();

  return SeatMapModel.create({ eventId, layoutType: "grid", seats: grid });
};

/** Creates an event with a matching seat map in one call. */
export const createEventWithSeatMap = async (
  eventOverrides: CreateEventOptions = {},
  seatMapOverrides: Omit<CreateSeatMapOptions, "eventId"> = {}
): Promise<{ event: IEvent; seatMap: ISeatMap }> => {
  const event = await createEvent(eventOverrides);
  const seatMap = await createSeatMap({
    eventId: event._id as Types.ObjectId,
    ...seatMapOverrides,
  });
  return { event, seatMap };
};

export interface CreateBookingOptions {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  items?: IBookingItem[];
  status?: IBooking["status"];
  expiresAt?: Date;
}

/** Creates a booking record only — it does not reserve seats on the seat map. */
export const createBooking = async ({
  userId,
  eventId,
  items = [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
  status = "unpaid",
  expiresAt = new Date(Date.now() + 10 * 60_000),
}: CreateBookingOptions): Promise<IBooking> =>
  BookingModel.create({
    userId,
    eventId,
    items,
    total: items.reduce((sum, i) => sum + i.price, 0),
    status,
    expiresAt,
  });
