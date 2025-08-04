// src/services/eventService.ts
import mongoose, { Types } from "mongoose";
import { eventModel, IEvent } from "../models/eventModel";
import venueModel from "../models/venueModel";

export interface CreateEventDTO {
  title: string;
  description: string;
  categories: string[];
  status: "draft" | "published" | "archived";
  venueType: "custom" | "template";
  templateVenueId?: string;
  venueName?: string;
  venueAddress?: string;
  startTime: Date;
  endTime: Date;
  seatMapId?: string;
  organizerId: string;
}

export const createEvent = async (
  eventData: CreateEventDTO
): Promise<IEvent> => {
  if (eventData.venueType === "template") {
    if (!eventData.templateVenueId) {
      const e = new Error("templateVenueId is required for template venues");
      // @ts-ignore
      e.status = 400;
      throw e;
    }
  } else {
    if (!eventData.venueName || !eventData.venueAddress) {
      const e = new Error(
        "venueName and venueAddress are required for custom venues"
      );
      // @ts-ignore
      e.status = 400;
      throw e;
    }
  }

  if (
    eventData.status === "published" &&
    (!eventData.seatMapId || eventData.seatMapId === "")
  ) {
    const e = new Error("Cannot publish an event without a seat map");
    // @ts-ignore
    e.status = 400;
    throw e;
  }

  if (eventData.startTime >= eventData.endTime) {
    const e = new Error("Event startTime must be before endTime");
    // @ts-ignore
    e.status = 400;
    throw e;
  }

  if (
    !Array.isArray(eventData.categories) ||
    !eventData.categories.every(
      (cat) => typeof cat === "string" && cat.length <= 30
    )
  ) {
    const e = new Error(
      "Categories must be an array of up to 30-character strings"
    );
    // @ts-ignore
    e.status = 400;
    throw e;
  }

  const payload: any = {
    organizerId: new mongoose.Types.ObjectId(eventData.organizerId),
    title: eventData.title,
    description: eventData.description,
    categories: eventData.categories,
    status: eventData.status,
    venueType: eventData.venueType,
    startTime: eventData.startTime,
    endTime: eventData.endTime,
    ...(eventData.seatMapId && {
      seatMapId: new mongoose.Types.ObjectId(eventData.seatMapId),
    }),
  };

  if (eventData.venueType === "template") {
    const oid = new mongoose.Types.ObjectId(eventData.templateVenueId!);
    const existingVenue = await venueModel.findById(oid).lean().exec();
    if (!existingVenue) {
      const e = new Error("Selected template venue not found");
      // @ts-ignore
      e.status = 404;
      throw e;
    }
    payload.templateVenueId = oid;
    payload.venueName = existingVenue.name;
    payload.venueAddress = existingVenue.address;
    payload.layoutType = existingVenue.defaultLayoutType;
    if (existingVenue.defaultSeatMap?.length) {
      payload.defaultSeatMap = existingVenue.defaultSeatMap;
    }
  } else {
    payload.venueName = eventData.venueName;
    payload.venueAddress = eventData.venueAddress;
  }

  try {
    return await eventModel.create(payload);
  } catch (error: any) {
    console.error("🔥 createEvent Mongoose error:", error);
    if (error.name === "ValidationError") {
      // Log each invalid field
      for (const [path, errObj] of Object.entries(error.errors)) {
        console.error(`  • ${path}: ${(errObj as any).message}`);
      }
      const e = new Error("Invalid event data");
      // @ts-ignore
      e.status = 400;
      throw e;
    }
    if (error.code === 11000) {
      const e = new Error("An event with those details already exists");
      // @ts-ignore
      e.status = 409;
      throw e;
    }
    throw error;
  }
};

export interface ListEventsFilter {
  organizerId?: string;
  status?: "draft" | "published" | "archived";
  upcomingOnly?: boolean;
}

export const listEvents = async (
  filter: ListEventsFilter
): Promise<IEvent[]> => {
  const query: any = {};
  console.log(query);
  if (filter.organizerId) {
    query.organizerId = new mongoose.Types.ObjectId(filter.organizerId);
  }
  if (filter.status) {
    query.status = filter.status;
  }
  if (filter.upcomingOnly) {
    query.startTime = { $gte: new Date() };
  }

  return eventModel.find(query).lean().exec();
};

export const getEventById = async (id: string): Promise<IEvent> => {
  if (!Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid Event ID");
    // @ts-ignore
    err.status = 400;
    throw err;
  }
  const event = await eventModel.findById(id).lean().exec();
  if (!event) {
    const err = new Error("Event not found");
    // @ts-ignore
    err.status = 404;
    throw err;
  }
  return event as IEvent;
};

export const updateEvent = async (
  eventId: string,
  data: CreateEventDTO,
  userId: string
): Promise<IEvent> => {
  // 1) Validate eventId
  if (!Types.ObjectId.isValid(eventId)) {
    const err = new Error("Invalid event ID");
    // @ts-ignore
    err.status = 400;
    throw err;
  }

  // 2) Fetch the existing event
  const existing = await getEventById(eventId);

  // 3) Ownership check
  if (existing.organizerId.toString() !== userId) {
    const err = new Error("Forbidden: you don’t own this event");
    // @ts-ignore
    err.status = 403;
    throw err;
  }

  // 4) Perform the update with validators
  try {
    const updated = await eventModel.findByIdAndUpdate(eventId, data, {
      new: true,
      runValidators: true,
    });
    // (Since we know it existed, updated should never be null)
    return updated as IEvent;
  } catch (error: any) {
    // 5) Handle validation / duplicate-key
    if (error.name === "ValidationError") {
      const e = new Error("Invalid event data");
      // @ts-ignore
      e.status = 400;
      throw e;
    }
    if (error.code === 11000) {
      const e = new Error("An event with those details already exists");
      // @ts-ignore
      e.status = 409;
      throw e;
    }
    throw error;
  }
};
export const deleteEvent = async (
  eventId: string,
  userId: string
): Promise<void> => {
  // 1) Fetch & validate
  const existing = await getEventById(eventId);

  // 2) Ownership
  if (existing.organizerId.toString() !== userId) {
    const e = new Error("Forbidden: you don’t own this event");
    // @ts-ignore
    e.status = 403;
    throw e;
  }

  // 3) Delete
  await eventModel.findByIdAndDelete(eventId).exec();
};
