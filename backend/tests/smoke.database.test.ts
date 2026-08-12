import mongoose from "mongoose";
import { describe, expect, it } from "vitest";
import BookingModel from "../src/models/bookingModel";
import SeatMapModel from "../src/models/seatMapModel";
import userModel from "../src/models/userModel";
import {
  createAttendee,
  createBooking,
  createEventWithSeatMap,
} from "./factories";

describe("test database harness", () => {
  it("writes and reads a record through the in-memory replica set", async () => {
    const { user } = await createAttendee({ email: "smoke@example.test" });

    const found = await userModel.findById(user._id).lean();

    expect(found).not.toBeNull();
    expect(found!.email).toBe("smoke@example.test");
    expect(found!.role).toBe("attendee");
  });

  it("starts every test with an empty database", async () => {
    // The user created by the previous test must not be visible here.
    await expect(userModel.countDocuments()).resolves.toBe(0);
    await expect(BookingModel.countDocuments()).resolves.toBe(0);
  });

  it("supports multi-document transactions", async () => {
    // The whole point of MongoMemoryReplSet: `bookingService` cannot be tested
    // without transaction support.
    const { user } = await createAttendee();
    const { event } = await createEventWithSeatMap();

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await BookingModel.create(
          [
            {
              userId: user._id,
              eventId: event._id,
              items: [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
              total: 100,
              status: "unpaid",
              expiresAt: new Date(Date.now() + 60_000),
            },
          ],
          { session }
        );
      });
    } finally {
      session.endSession();
    }

    await expect(BookingModel.countDocuments()).resolves.toBe(1);
  });

  it("rolls a transaction back when it throws", async () => {
    const { user } = await createAttendee();
    const { event } = await createEventWithSeatMap();

    const session = await mongoose.startSession();
    await expect(
      session.withTransaction(async () => {
        await BookingModel.create(
          [
            {
              userId: user._id,
              eventId: event._id,
              items: [{ seatCoords: { x: 0, y: 0 }, price: 100 }],
              total: 100,
              status: "unpaid",
            },
          ],
          { session }
        );
        throw new Error("abort");
      })
    ).rejects.toThrow("abort");
    session.endSession();

    await expect(BookingModel.countDocuments()).resolves.toBe(0);
  });

  it("provides factories for events, seat maps, and bookings", async () => {
    const { user } = await createAttendee();
    const { event, seatMap } = await createEventWithSeatMap(
      { title: "Factory Event" },
      { rows: 3, cols: 4, price: 250 }
    );

    expect(event.title).toBe("Factory Event");
    expect(event.status).toBe("published");
    expect(seatMap.seats).toHaveLength(12);
    expect(seatMap.seats.every((s) => s.status === "available")).toBe(true);

    const booking = await createBooking({
      userId: user._id as mongoose.Types.ObjectId,
      eventId: event._id as mongoose.Types.ObjectId,
      items: [
        { seatCoords: { x: 1, y: 1 }, price: 250 },
        { seatCoords: { x: 2, y: 1 }, price: 250 },
      ],
    });

    expect(booking.total).toBe(500);
    expect(booking.status).toBe("unpaid");

    const storedMap = await SeatMapModel.findOne({ eventId: event._id }).lean();
    expect(storedMap!.seats).toHaveLength(12);
  });
});
