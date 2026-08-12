import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { getOrganizerStats } from "../src/services/organizerService";
import {
  createBooking,
  createEvent,
  createOrganizer,
} from "./factories";

describe("organizer dashboard statistics", () => {
  it("excludes cancelled events while retaining ordinary archived events", async () => {
    const { user: organizer } = await createOrganizer();
    const organizerId = organizer._id as Types.ObjectId;

    const published = await createEvent({ organizerId, status: "published" });
    const archived = await createEvent({ organizerId, status: "archived" });
    const cancelled = await createEvent({
      organizerId,
      status: "archived",
      isCancelled: true,
    });

    await createBooking({
      userId: organizerId,
      eventId: published._id as Types.ObjectId,
      status: "paid",
      items: [
        { seatCoords: { x: 0, y: 0 }, price: 80 },
        { seatCoords: { x: 1, y: 0 }, price: 120 },
      ],
    });
    await createBooking({
      userId: organizerId,
      eventId: archived._id as Types.ObjectId,
      status: "paid",
      items: [{ seatCoords: { x: 0, y: 0 }, price: 50 }],
    });

    // A defensive legacy-data case: even if a cancelled event still has a
    // paid row, it must not leak into organizer performance statistics.
    await createBooking({
      userId: organizerId,
      eventId: cancelled._id as Types.ObjectId,
      status: "paid",
      items: [{ seatCoords: { x: 0, y: 0 }, price: 999 }],
    });

    const stats = await getOrganizerStats(String(organizerId));

    expect(stats).toMatchObject({
      eventCount: 2,
      publishedCount: 1,
      draftCount: 0,
      archivedCount: 1,
      upcomingCount: 1,
      totalRevenue: 250,
      ticketsSold: 3,
    });
  });

  it("returns zero event counts when the organizer only has cancellations", async () => {
    const { user: organizer } = await createOrganizer();
    await createEvent({
      organizerId: organizer._id as Types.ObjectId,
      status: "archived",
      isCancelled: true,
    });

    await expect(getOrganizerStats(String(organizer._id))).resolves.toEqual({
      eventCount: 0,
      publishedCount: 0,
      draftCount: 0,
      archivedCount: 0,
      upcomingCount: 0,
      totalRevenue: 0,
      ticketsSold: 0,
    });
  });
});
