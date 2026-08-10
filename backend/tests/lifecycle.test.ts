import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import BookingModel from "../src/models/bookingModel";
import SeatMapModel from "../src/models/seatMapModel";
import venueModel from "../src/models/venueModel";
import { eventModel } from "../src/models/eventModel";
import { auditLogModel } from "../src/models/auditLogModel";
import { deleteEvent } from "../src/services/eventServices";
import { deleteVenue } from "../src/services/venueService";
import {
  createAttendee,
  createEvent,
  createEventWithSeatMap,
  createOrganizer,
} from "./factories";

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
      // No money moved — the obligation is recorded, not claimed as met.
      refundsOwed: true,
    });
  });

  it("refuses to cancel an event twice", async () => {
    const { organizer, event } = await eventWithBookings();

    await deleteEvent(String(event._id), String(organizer._id));

    await expect(
      deleteEvent(String(event._id), String(organizer._id))
    ).rejects.toMatchObject({ status: 409 });
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
});
