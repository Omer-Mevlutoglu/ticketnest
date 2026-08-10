import mongoose, { Types } from "mongoose";
import { eventModel, IEvent } from "../models/eventModel";
import venueModel from "../models/venueModel";
import { upsertSeatMap } from "./seatMapService";
import { httpError } from "../utils/httpError";
import { paginate, Page } from "../utils/pagination";
import BookingModel from "../models/bookingModel";
import SeatMapModel from "../models/seatMapModel";
import userModel from "../models/userModel";
import { recordAudit } from "../models/auditLogModel";
import { sendEventCancelledEmail } from "./emailService";

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
  poster?: string;
}

export const createEvent = async (
  eventData: CreateEventDTO
): Promise<IEvent> => {
  // 1) Validate venue fields
  let existingVenue: any;
  if (eventData.venueType === "template") {
    if (!eventData.templateVenueId) {
      throw httpError(400, "templateVenueId is required for template venues");
    }
    const oid = new mongoose.Types.ObjectId(eventData.templateVenueId);
    existingVenue = await venueModel.findById(oid).lean().exec();
    if (!existingVenue) {
      throw httpError(404, "Selected template venue not found");
    }
  } else {
    if (!eventData.venueName || !eventData.venueAddress) {
      throw httpError(
        400,
        "venueName and venueAddress are required for custom venues"
      );
    }
  }

  // If publishing on create, enforce real seat-map availability rules
  if (eventData.status === "published") {
    if (eventData.venueType === "template") {
      const hasTemplateSeats =
        !!existingVenue?.defaultSeatMap &&
        existingVenue.defaultSeatMap.length > 0;
      if (!hasTemplateSeats) {
        throw httpError(
          400,
          "Cannot publish: selected template venue has no default seat map."
        );
      }
    } else {
      throw httpError(
        400,
        "Custom venues cannot be published at creation. Create as draft, add a seat map via PUT /api/events/:id/seatmap, then publish."
      );
    }
  }

  if (eventData.startTime >= eventData.endTime) {
    throw httpError(400, "Event startTime must be before endTime");
  }
  if (
    !Array.isArray(eventData.categories) ||
    !eventData.categories.every(
      (cat) => typeof cat === "string" && cat.length <= 30
    )
  ) {
    throw httpError(
      400,
      "Categories must be an array of up to 30-character strings"
    );
  }

  // 3) Build payload for Event model (no seatMap details)
  const payload: any = {
    organizerId: new mongoose.Types.ObjectId(eventData.organizerId),
    title: eventData.title,
    description: eventData.description,
    categories: eventData.categories,
    status: eventData.status,
    venueType: eventData.venueType,
    startTime: eventData.startTime,
    endTime: eventData.endTime,
    poster: eventData.poster,
    ...(eventData.venueType === "custom" && {
      venueName: eventData.venueName,
      venueAddress: eventData.venueAddress,
    }),
    ...(eventData.venueType === "template" && {
      templateVenueId: new mongoose.Types.ObjectId(eventData.templateVenueId!),
      venueName: existingVenue.name,
      venueAddress: existingVenue.address,
    }),
  };

  // 4) Persist the Event
  const event = await eventModel.create(payload);

  // 5) For template venues: auto‐generate the initial SeatMap
  if (
    eventData.venueType === "template" &&
    existingVenue.defaultSeatMap?.length
  ) {
    await upsertSeatMap(
      event.id, // eventId
      eventData.organizerId, // organizer owner
      existingVenue.defaultSeatMap.map((s: any) => ({
        x: s.x,
        y: s.y,
        tier: s.tier,
        price: s.price,
        status: "available",
      }))
    );
  }

  return event;
};

export interface ListEventsFilter {
  organizerId?: string;
  status?: "draft" | "published" | "archived";
  upcomingOnly?: boolean;
}

const buildEventQuery = (filter: ListEventsFilter) => {
  const query: any = {};
  if (filter.organizerId) {
    query.organizerId = new mongoose.Types.ObjectId(filter.organizerId);
  }
  if (filter.status) {
    query.status = filter.status;
  }
  query.isCancelled = { $ne: true };
  if (filter.upcomingOnly) {
    query.startTime = { $gte: new Date() };
  }
  return query;
};

export const listEvents = async (
  filter: ListEventsFilter
): Promise<IEvent[]> => {
  return eventModel.find(buildEventQuery(filter)).lean().exec();
};

/**
 * A page of events.
 *
 * Sorted by the field each index is built around: upcoming-first for the public
 * listing, newest-first for an organizer's own. `paginate` adds `_id` as a
 * tiebreaker so page boundaries are stable.
 */
export const listEventsPage = async (
  filter: ListEventsFilter,
  pagination: { page: number; limit: number }
): Promise<Page<IEvent>> =>
  paginate(eventModel, {
    filter: buildEventQuery(filter),
    ...pagination,
    sort: filter.organizerId ? { createdAt: -1 } : { startTime: 1 },
  });

export const getEventById = async (id: string): Promise<IEvent> => {
  if (!Types.ObjectId.isValid(id)) {
    throw httpError(400, "Invalid Event ID");
  }
  const event = await eventModel.findById(id).lean().exec();
  if (!event) {
    throw httpError(404, "Event not found");
  }
  return event as IEvent;
};

/**
 * Fetches an event for an anonymous visitor.
 *
 * Anything not published, or cancelled, is reported as absent rather than
 * forbidden: a 403 would confirm the ID exists and leak an organizer's
 * unpublished plans.
 */
export const getPublishedEventById = async (id: string): Promise<IEvent> => {
  const event = await getEventById(id);

  if (event.status !== "published" || event.isCancelled) {
    throw httpError(404, "Event not found");
  }

  return event;
};


export const updateEvent = async (
  eventId: string,
  data: Partial<CreateEventDTO>,
  userId: string
): Promise<IEvent> => {
  if (!Types.ObjectId.isValid(eventId)) {
    throw httpError(400, "Invalid event ID");
  }

  const existing = await getEventById(eventId);

  if (existing.organizerId.toString() !== userId) {
    throw httpError(403, "Forbidden: you don’t own this event");
  }

  //publishing rules on UPDATE ----
  const isPublishing =
    typeof data.status === "string" &&
    data.status === "published" &&
    existing.status !== "published";

  if (isPublishing) {
    // Must have a seat map already linked
    const hasSeatMap = !!existing.seatMapId;
    if (!hasSeatMap) {
      throw httpError(400, "Cannot publish without a seat map");
    }

    // Optional: disallow switching venue type at publish time
    if (
      typeof data.venueType !== "undefined" &&
      data.venueType !== existing.venueType
    ) {
      throw httpError(400, "Cannot change venueType when publishing");
    }

    // Optional: re-check time sanity if updating dates together
    if (data.startTime && data.endTime && data.startTime >= data.endTime) {
      throw httpError(400, "Event startTime must be before endTime");
    }
  }
  // ----------------------------------------

  //whitelist mutable fields
  const allowed: any = {
    ...(typeof data.title !== "undefined" && { title: data.title }),
    ...(typeof data.description !== "undefined" && {
      description: data.description,
    }),
    ...(typeof data.categories !== "undefined" && {
      categories: data.categories,
    }),
    ...(typeof data.status !== "undefined" && { status: data.status }),
    // allow editing custom venue text fields:
    ...(existing.venueType === "custom" &&
      typeof data.venueName !== "undefined" && { venueName: data.venueName }),
    ...(existing.venueType === "custom" &&
      typeof data.venueAddress !== "undefined" && {
        venueAddress: data.venueAddress,
      }),
    ...(typeof data.poster !== "undefined" && { poster: data.poster }),
    ...(typeof data.startTime !== "undefined" && { startTime: data.startTime }),
    ...(typeof data.endTime !== "undefined" && { endTime: data.endTime }),
  };

  try {
    const updated = await eventModel.findByIdAndUpdate(eventId, allowed, {
      new: true,
      runValidators: true,
    });
    return updated as IEvent;
  } catch (error: any) {
    if (error.name === "ValidationError") {
      throw httpError(400, "Invalid event data");
    }
    if (error.code === 11000) {
      throw httpError(409, "An event with those details already exists");
    }
    throw error;
  }
};

export interface CancelEventResult {
  /** Paid bookings moved to `refunded`. */
  refundedBookings: number;
  /** Unpaid holds released. */
  releasedBookings: number;
  /** Seats returned to `available`. */
  releasedSeats: number;
}

/**
 * Cancels an event and unwinds everything attached to it.
 *
 * Previously this only set two flags: paid bookings stayed `paid`, their seats
 * stayed `sold`, and ticket holders were never told. The `refunded` status
 * existed in the enum and no code path ever set it.
 *
 * Now the state machine completes. Note what is *not* claimed: no money moves,
 * because no provider ever took any. `refunded` here records the booking's
 * final state, and the audit entry records that a real refund is owed if a
 * provider is ever connected — see Phase 6 Option A.
 */
export const deleteEvent = async (
  eventId: string,
  userId: string
): Promise<CancelEventResult> => {
  const existing = await getEventById(eventId);

  if (existing.organizerId.toString() !== userId) {
    throw httpError(403, "Forbidden: you don’t own this event");
  }

  if (existing.isCancelled) {
    throw httpError(409, "This event is already cancelled");
  }

  const eventOid = new Types.ObjectId(eventId);

  await eventModel.findByIdAndUpdate(eventId, {
    $set: { isCancelled: true, status: "archived" },
  });

  // Paid bookings become refundable; unpaid holds simply lapse. Both are
  // conditional, so re-running after a partial failure is safe.
  const [refunded, released] = await Promise.all([
    BookingModel.updateMany(
      { eventId: eventOid, status: "paid" },
      { $set: { status: "refunded" } }
    ),
    BookingModel.updateMany(
      { eventId: eventOid, status: "unpaid" },
      { $set: { status: "expired" } }
    ),
  ]);

  // Free every seat: nobody holds a seat at an event that is not happening.
  const seatMap = await SeatMapModel.findOne({ eventId: eventOid })
    .select("seats")
    .lean();

  let releasedSeats = 0;
  if (seatMap) {
    releasedSeats = seatMap.seats.filter((s) => s.status !== "available").length;

    await SeatMapModel.updateOne(
      { eventId: eventOid },
      {
        $set: { "seats.$[held].status": "available" },
        $unset: {
          "seats.$[held].reservedBy": "",
          "seats.$[held].reservedUntil": "",
        },
      },
      { arrayFilters: [{ "held.status": { $ne: "available" } }] }
    );
  }

  const result: CancelEventResult = {
    refundedBookings: refunded.modifiedCount,
    releasedBookings: released.modifiedCount,
    releasedSeats,
  };

  await recordAudit({
    action: "event.cancelled",
    actorId: userId,
    targetType: "event",
    targetId: eventId,
    metadata: {
      title: existing.title,
      ...result,
      // Flags the obligation without pretending it was met.
      refundsOwed: result.refundedBookings > 0,
    },
  });

  // Awaited, not fire-and-forget: a floating promise would outlive the request
  // and log confusing failures against a closed connection. A mail failure is
  // swallowed here so it cannot undo a cancellation already applied.
  try {
    await notifyTicketHolders(eventOid, existing.title);
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "event.cancel.notify_failed",
        eventId,
        message: err instanceof Error ? err.message : String(err),
      })
    );
  }

  return result;
};

/** Emails everyone who held a ticket. No-ops when email is switched off. */
const notifyTicketHolders = async (
  eventId: Types.ObjectId,
  title: string
): Promise<void> => {
  const affected = await BookingModel.find({
    eventId,
    status: "refunded",
  })
    .select("userId")
    .lean();

  if (affected.length === 0) return;

  const recipients = await userModel
    .find({ _id: { $in: affected.map((b) => b.userId) } })
    .select("email")
    .lean();

  for (const recipient of recipients) {
    await sendEventCancelledEmail(recipient.email, title);
  }
};
