import { Types } from "mongoose";
import { afterEach, describe, expect, it, vi } from "vitest";
import BookingModel from "../src/models/bookingModel";
import SeatMapModel from "../src/models/seatMapModel";
import venueModel from "../src/models/venueModel";
import { eventModel } from "../src/models/eventModel";
import { auditLogModel } from "../src/models/auditLogModel";
import { deleteEvent } from "../src/services/eventServices";
import { createBookingFromSelection } from "../src/services/bookingService";
import { deleteVenue } from "../src/services/venueService";
import {
  createAttendee,
  createEvent,
  createEventWithSeatMap,
  createOrganizer,
} from "./factories";

const sendgrid = vi.hoisted(() => ({
  send: vi.fn(),
  setApiKey: vi.fn(),
}));

vi.mock("@sendgrid/mail", () => ({ default: sendgrid }));

afterEach(() => {
  process.env.ENABLE_EMAIL = "false";
  sendgrid.send.mockReset();
  vi.restoreAllMocks();
});

/** WP5.3 — A9 and A10, the last two bugs from the original review. */

const makeVenue = async (name = "Template Hall") =>
  venueModel.create({
    name,
    address: "1 Example Street",
    capacity: 100,
    defaultLayoutType: "grid",
    description: "A venue used by the lifecycle tests.",
    isActive: true,
  });

describe("WP5.3 — venue lifecycle (A9)", () => {
  it("refuses to remove a venue that live events depend on", async () => {
    const venue = await makeVenue();
    await createEvent({ status: "published" }).then((event) =>
      eventModel.updateOne(
        { _id: event._id },
        { $set: { venueType: "template", templateVenueId: venue._id } }
      )
    );

    await expect(deleteVenue(String(venue._id))).rejects.toMatchObject({
      status: 409,
      code: "VENUE_IN_USE",
    });

    // Still there, still active — the old code deleted it outright.
    const after = await venueModel.findById(venue._id).lean();
    expect(after).not.toBeNull();
    expect(after!.isActive).toBe(true);
  });

  it("names how many events are blocking it", async () => {
    const venue = await makeVenue();
    for (let i = 0; i < 3; i++) {
      const event = await createEvent({ title: `Uses venue ${i}` });
      await eventModel.updateOne(
        { _id: event._id },
        { $set: { venueType: "template", templateVenueId: venue._id } }
      );
    }

    await expect(deleteVenue(String(venue._id))).rejects.toThrow(
      /3 active events/
    );
  });

  it("soft-disables rather than deleting when nothing depends on it", async () => {
    const venue = await makeVenue("Unused Hall");

    await deleteVenue(String(venue._id));

    const after = await venueModel.findById(venue._id).lean();
    // The document survives, so events archived against it keep resolving.
    expect(after).not.toBeNull();
    expect(after!.isActive).toBe(false);
  });

  it("ignores archived and cancelled events when deciding", async () => {
    const venue = await makeVenue("Past Hall");
    const archived = await createEvent({ status: "archived" });
    const cancelled = await createEvent({ isCancelled: true });

    for (const event of [archived, cancelled]) {
      await eventModel.updateOne(
        { _id: event._id },
        { $set: { venueType: "template", templateVenueId: venue._id } }
      );
    }

    await expect(deleteVenue(String(venue._id))).resolves.toEqual({
      eventsAffected: 0,
    });
  });

  it("records both the block and the disable", async () => {
    const { user: admin } = await createAttendee();
    const blocked = await makeVenue("Blocked");
    const event = await createEvent({});
    await eventModel.updateOne(
      { _id: event._id },
      { $set: { venueType: "template", templateVenueId: blocked._id } }
    );

    await deleteVenue(String(blocked._id), String(admin._id)).catch(() => {});

    const disabled = await makeVenue("Disabled");
    await deleteVenue(String(disabled._id), String(admin._id));

    const actions = await auditLogModel.find({ targetType: "venue" }).lean();
    expect(actions.map((a) => a.action).sort()).toEqual([
      "venue.delete_blocked",
      "venue.disabled",
    ]);
    expect(String(actions[0].actorId)).toBe(String(admin._id));
  });

  it("still 404s for a venue that does not exist", async () => {
    await expect(
      deleteVenue(String(new Types.ObjectId()))
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("WP5.3 — event cancellation (A10)", () => {
  /** An event with one paid booking, one unpaid hold, and matching seat state. */
  const eventWithBookings = async () => {
    const { user: organizer } = await createOrganizer();
    const { user: buyer } = await createAttendee();
    const { user: holder } = await createAttendee();

    const { event } = await createEventWithSeatMap(
      { organizerId: organizer._id, status: "published" },
      { rows: 2, cols: 2 }
    );
    const eventId = event._id as Types.ObjectId;

    await SeatMapModel.updateOne(
      { eventId },
      { $set: { "seats.$[s].status": "sold" } },
      { arrayFilters: [{ "s.x": 0, "s.y": 0 }] }
    );
    await SeatMapModel.updateOne(
      { eventId },
      {
        $set: {
          "seats.$[s].status": "reserved",
          "seats.$[s].reservedBy": holder._id,
          "seats.$[s].reservedUntil": new Date(Date.now() + 600_000),
        },
      },
      { arrayFilters: [{ "s.x": 1, "s.y": 0 }] }
    );

    const paid = await BookingModel.create({
      userId: buyer._id,
      eventId,
      items: [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
      total: 100,
      status: "paid",
    });
    const unpaid = await BookingModel.create({
      userId: holder._id,
      eventId,
      items: [{ seatCoords: { x: 1, y: 0 }, price: 100 }],
      total: 100,
      status: "unpaid",
      expiresAt: new Date(Date.now() + 600_000),
    });

    return { organizer, event, eventId, paid, unpaid };
  };

  it("moves paid bookings to refunded", async () => {
    const { organizer, event, paid } = await eventWithBookings();

    const result = await deleteEvent(String(event._id), String(organizer._id));

    expect(result.refundedBookings).toBe(1);
    await expect(
      BookingModel.findById(paid._id).lean().then((b) => b!.status)
    ).resolves.toBe("refunded");
  });

  it("lapses unpaid holds", async () => {
    const { organizer, event, unpaid } = await eventWithBookings();

    const result = await deleteEvent(String(event._id), String(organizer._id));

    expect(result.releasedBookings).toBe(1);
    await expect(
      BookingModel.findById(unpaid._id).lean().then((b) => b!.status)
    ).resolves.toBe("expired");
  });

  it("frees every seat", async () => {
    const { organizer, event, eventId } = await eventWithBookings();

    const result = await deleteEvent(String(event._id), String(organizer._id));

    expect(result.releasedSeats).toBe(2);
    const map = await SeatMapModel.findOne({ eventId }).lean();
    expect(map!.seats.every((s) => s.status === "available")).toBe(true);
    expect(map!.seats.every((s) => !s.reservedBy)).toBe(true);
  });

  it("marks the event cancelled and archived", async () => {
    const { organizer, event } = await eventWithBookings();

    await deleteEvent(String(event._id), String(organizer._id));

    const after = await eventModel.findById(event._id).lean();
    expect(after!.isCancelled).toBe(true);
    expect(after!.status).toBe("archived");
  });

  it("records the cancellation, including that refunds are owed", async () => {
    const { organizer, event } = await eventWithBookings();

    await deleteEvent(String(event._id), String(organizer._id));

    const entry = await auditLogModel.findOne({ action: "event.cancelled" }).lean();
    expect(entry).not.toBeNull();
    expect(String(entry!.actorId)).toBe(String(organizer._id));
    expect(entry!.metadata).toMatchObject({
      refundedBookings: 1,
      releasedSeats: 2,
      paymentMode: "simulated",
      realRefundsProcessed: false,
    });
  });

  it("returns the saved result when cancellation is repeated", async () => {
    const { organizer, event } = await eventWithBookings();

    const first = await deleteEvent(String(event._id), String(organizer._id));
    const repeated = await deleteEvent(
      String(event._id),
      String(organizer._id)
    );

    expect(first.alreadyCancelled).toBe(false);
    expect(repeated).toEqual({ ...first, alreadyCancelled: true });
    await expect(
      auditLogModel.countDocuments({ action: "event.cancelled" })
    ).resolves.toBe(1);
    await expect(
      auditLogModel.countDocuments({ action: "event.cancellation_notification" })
    ).resolves.toBe(1);
  });

  it("still refuses a cancellation by someone who does not own the event", async () => {
    const { event } = await eventWithBookings();
    const { user: stranger } = await createOrganizer();

    await expect(
      deleteEvent(String(event._id), String(stranger._id))
    ).rejects.toMatchObject({ status: 403 });

    const after = await eventModel.findById(event._id).lean();
    expect(after!.isCancelled).toBe(false);
  });

  it("leaves other events alone", async () => {
    const { organizer, event } = await eventWithBookings();
    const other = await createEventWithSeatMap({
      organizerId: organizer._id,
      status: "published",
    });

    await deleteEvent(String(event._id), String(organizer._id));

    const untouched = await eventModel.findById(other.event._id).lean();
    expect(untouched!.isCancelled).toBe(false);
  });

  const expectCancellationRolledBack = async (
    eventId: Types.ObjectId,
    paidId: Types.ObjectId,
    unpaidId: Types.ObjectId
  ) => {
    const [event, paid, unpaid, map, auditCount] = await Promise.all([
      eventModel.findById(eventId).lean(),
      BookingModel.findById(paidId).lean(),
      BookingModel.findById(unpaidId).lean(),
      SeatMapModel.findOne({ eventId }).lean(),
      auditLogModel.countDocuments(),
    ]);

    expect(event!.isCancelled).toBe(false);
    expect(event!.status).toBe("published");
    expect(event!.cancellationSummary).toBeUndefined();
    expect(paid!.status).toBe("paid");
    expect(unpaid!.status).toBe("unpaid");
    expect(map!.seats.find((seat) => seat.x === 0 && seat.y === 0)!.status).toBe(
      "sold"
    );
    expect(map!.seats.find((seat) => seat.x === 1 && seat.y === 0)!.status).toBe(
      "reserved"
    );
    expect(auditCount).toBe(0);
  };

  it("rolls everything back when booking cleanup fails", async () => {
    const { organizer, eventId, paid, unpaid } = await eventWithBookings();
    vi.spyOn(BookingModel, "updateMany").mockRejectedValueOnce(
      new Error("injected booking failure")
    );

    await expect(
      deleteEvent(String(eventId), String(organizer._id))
    ).rejects.toThrow("injected booking failure");

    await expectCancellationRolledBack(
      eventId,
      paid._id as Types.ObjectId,
      unpaid._id as Types.ObjectId
    );
  });

  it("rolls event and bookings back when seat cleanup fails", async () => {
    const { organizer, eventId, paid, unpaid } = await eventWithBookings();
    vi.spyOn(SeatMapModel, "updateOne").mockRejectedValueOnce(
      new Error("injected seat failure")
    );

    await expect(
      deleteEvent(String(eventId), String(organizer._id))
    ).rejects.toThrow("injected seat failure");

    await expectCancellationRolledBack(
      eventId,
      paid._id as Types.ObjectId,
      unpaid._id as Types.ObjectId
    );
  });

  it("rolls all lifecycle state back when the required audit write fails", async () => {
    const { organizer, eventId, paid, unpaid } = await eventWithBookings();
    vi.spyOn(auditLogModel, "create").mockRejectedValueOnce(
      new Error("injected audit failure") as never
    );

    await expect(
      deleteEvent(String(eventId), String(organizer._id))
    ).rejects.toThrow("injected audit failure");

    await expectCancellationRolledBack(
      eventId,
      paid._id as Types.ObjectId,
      unpaid._id as Types.ObjectId
    );
  });

  it("cannot leave a live booking when booking creation races cancellation", async () => {
    const { user: organizer } = await createOrganizer();
    const { user: attendee } = await createAttendee();
    const { event } = await createEventWithSeatMap({
      organizerId: organizer._id as Types.ObjectId,
      status: "published",
    });

    const [cancellation, bookingAttempt] = await Promise.allSettled([
      deleteEvent(String(event._id), String(organizer._id)),
      createBookingFromSelection(String(attendee._id), {
        eventId: String(event._id),
        seats: [{ x: 0, y: 0 }],
      }),
    ]);

    expect(cancellation.status).toBe("fulfilled");
    const after = await eventModel.findById(event._id).lean();
    expect(after!.isCancelled).toBe(true);

    const liveBookings = await BookingModel.countDocuments({
      eventId: event._id,
      status: { $in: ["unpaid", "paid"] },
    });
    expect(liveBookings).toBe(0);

    const map = await SeatMapModel.findOne({ eventId: event._id }).lean();
    expect(map!.seats.every((seat) => seat.status === "available")).toBe(true);

    if (bookingAttempt.status === "fulfilled") {
      await expect(
        BookingModel.findById(bookingAttempt.value._id)
          .lean()
          .then((booking) => booking!.status)
      ).resolves.toBe("expired");
    }
  });

  it("records disabled email as a post-commit notification outcome", async () => {
    const { organizer, event } = await eventWithBookings();

    await deleteEvent(String(event._id), String(organizer._id));

    expect(sendgrid.send).not.toHaveBeenCalled();
    const outcome = await auditLogModel
      .findOne({ action: "event.cancellation_notification" })
      .lean();
    expect(outcome!.metadata).toMatchObject({
      outcome: "disabled",
      recipients: 1,
      sent: 0,
      skipped: 1,
      failed: 0,
    });
  });

  it("keeps cancellation committed when enabled email delivery fails", async () => {
    process.env.ENABLE_EMAIL = "true";
    sendgrid.send.mockRejectedValueOnce(new Error("provider unavailable"));
    const { organizer, event, paid } = await eventWithBookings();

    await expect(
      deleteEvent(String(event._id), String(organizer._id))
    ).resolves.toMatchObject({ alreadyCancelled: false });

    await expect(
      eventModel.findById(event._id).lean().then((value) => value!.isCancelled)
    ).resolves.toBe(true);
    await expect(
      BookingModel.findById(paid._id).lean().then((value) => value!.status)
    ).resolves.toBe("refunded");
    const outcome = await auditLogModel
      .findOne({ action: "event.cancellation_notification" })
      .lean();
    expect(outcome!.metadata).toMatchObject({ outcome: "failed", failed: 1 });
  });
});
