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
import { redactSensitive } from "../utils/redactSensitive";

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
  /** True when this request observed an already-completed cancellation. */
  alreadyCancelled: boolean;
  /** TicketNest currently has simulated payments only. */
  paymentMode: "simulated";
  /** Explicitly avoids claiming that the mock flow moved money. */
  realRefundsProcessed: false;
}

/**
 * Cancels an event and unwinds everything attached to it.
 *
 * The database transition is one transaction: event, bookings, seats and its
 * audit row either all commit or all roll back. Repeating the call returns the
 * saved outcome without applying destructive work or sending duplicate mail.
 *
 * `refunded` is the terminal booking state retained by the existing schema.
 * TicketNest only has simulated payments, so the result and audit metadata are
 * explicit that no real charge or refund was processed.
 */
export const deleteEvent = async (
  eventId: string,
  userId: string
): Promise<CancelEventResult> => {
  if (!Types.ObjectId.isValid(eventId)) {
    throw httpError(400, "Invalid event ID");
  }

  const eventOid = new Types.ObjectId(eventId);
  const session = await mongoose.startSession();
  let result!: CancelEventResult;
  let shouldNotify = false;
  let eventTitle = "";

  try {
    await session.withTransaction(async () => {
      // withTransaction may retry this callback after a write conflict.
      shouldNotify = false;

      const existing = await eventModel.findById(eventOid).session(session).lean();
      if (!existing) throw httpError(404, "Event not found");
      if (existing.organizerId.toString() !== userId) {
        throw httpError(403, "Forbidden: you don’t own this event");
      }

      eventTitle = existing.title;

      if (existing.isCancelled) {
        const saved = existing.cancellationSummary;
        result = {
          refundedBookings: saved?.refundedBookings ?? 0,
          releasedBookings: saved?.releasedBookings ?? 0,
          releasedSeats: saved?.releasedSeats ?? 0,
          alreadyCancelled: true,
          paymentMode: "simulated",
          realRefundsProcessed: false,
        };
        return;
      }

      // Booking creation uses the same event-level write. If they race,
      // MongoDB retries the loser against the winner's committed state.
      const transitioned = await eventModel.updateOne(
        {
          _id: eventOid,
          organizerId: existing.organizerId,
          isCancelled: { $ne: true },
        },
        {
          $set: { isCancelled: true, status: "archived" },
          $inc: { lifecycleVersion: 1 },
        },
        { session }
      );
      if (transitioned.matchedCount !== 1) {
        throw httpError(409, "Event lifecycle changed; retry cancellation");
      }

      // Operations are deliberately sequential: parallel commands are not
      // supported on a MongoDB transaction session.
      const refunded = await BookingModel.updateMany(
        { eventId: eventOid, status: "paid" },
        { $set: { status: "refunded" } },
        { session }
      );
      const released = await BookingModel.updateMany(
        { eventId: eventOid, status: "unpaid" },
        { $set: { status: "expired" } },
        { session }
      );

      const seatMap = await SeatMapModel.findOne({ eventId: eventOid })
        .select("seats")
        .session(session)
        .lean();
      const releasedSeats =
        seatMap?.seats.filter((seat) => seat.status !== "available").length ?? 0;

      if (releasedSeats > 0) {
        await SeatMapModel.updateOne(
          { eventId: eventOid },
          {
            $set: { "seats.$[held].status": "available" },
            $unset: {
              "seats.$[held].reservedBy": "",
              "seats.$[held].reservedUntil": "",
            },
          },
          {
            arrayFilters: [{ "held.status": { $ne: "available" } }],
            session,
          }
        );
      }

      const summary = {
        cancelledAt: new Date(),
        refundedBookings: refunded.modifiedCount,
        releasedBookings: released.modifiedCount,
        releasedSeats,
        paymentMode: "simulated" as const,
        realRefundsProcessed: false as const,
      };

      await eventModel.updateOne(
        { _id: eventOid, isCancelled: true },
        { $set: { cancellationSummary: summary } },
        { session }
      );

      result = {
        refundedBookings: summary.refundedBookings,
        releasedBookings: summary.releasedBookings,
        releasedSeats: summary.releasedSeats,
        alreadyCancelled: false,
        paymentMode: summary.paymentMode,
        realRefundsProcessed: summary.realRefundsProcessed,
      };

      // Unlike ordinary best-effort audit writes, this row is required: a
      // cancellation must not commit without its durable explanation.
      await recordAudit(
        {
          action: "event.cancelled",
          actorId: userId,
          targetType: "event",
          targetId: eventId,
          metadata: {
            title: existing.title,
            ...result,
            bookingStateForPaid: "refunded",
            paymentMode: "simulated",
            realRefundsProcessed: false,
          },
        },
        { session, throwOnError: true }
      );

      shouldNotify = true;
    });
  } finally {
    await session.endSession();
  }

  // Email is outside the transaction. Provider failure cannot undo correct
  // database state, and its outcome is still visible in the audit trail.
  if (shouldNotify) {
    const notification = await notifyTicketHolders(eventOid, eventTitle);
    await recordAudit({
      action: "event.cancellation_notification",
      actorId: userId,
      targetType: "event",
      targetId: eventId,
      metadata: { ...notification },
    });
  }

  return result;
};

interface CancellationNotificationResult {
  outcome: "no_recipients" | "disabled" | "sent" | "partial_failure" | "failed";
  recipients: number;
  sent: number;
  skipped: number;
  failed: number;
}

/** Emails every paid ticket holder and reports a non-throwing outcome. */
const notifyTicketHolders = async (
  eventId: Types.ObjectId,
  title: string
): Promise<CancellationNotificationResult> => {
  const affected = await BookingModel.find({ eventId, status: "refunded" })
    .select("userId")
    .lean();

  if (affected.length === 0) {
    return {
      outcome: "no_recipients",
      recipients: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    };
  }

  const recipients = await userModel
    .find({ _id: { $in: affected.map((booking) => booking.userId) } })
    .select("email")
    .lean();

  if (recipients.length === 0) {
    return {
      outcome: "no_recipients",
      recipients: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    };
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipient of recipients) {
    try {
      const dispatched = await sendEventCancelledEmail(recipient.email, title);
      if (dispatched) sent++;
      else skipped++;
    } catch (err) {
      failed++;
      console.error(
        JSON.stringify({
          level: "error",
          event: "event.cancel.notify_failed",
          eventId: String(eventId),
          recipientId: String(recipient._id),
          message: redactSensitive(err instanceof Error ? err.message : err),
        })
      );
    }
  }

  const outcome: CancellationNotificationResult["outcome"] =
    failed === recipients.length
      ? "failed"
      : failed > 0
        ? "partial_failure"
        : sent > 0
          ? "sent"
          : "disabled";

  return {
    outcome,
    recipients: recipients.length,
    sent,
    skipped,
    failed,
  };
};
