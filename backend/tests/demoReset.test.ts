import mongoose, { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import ApprovalRequest from "../src/models/approvalRequest";
import { auditLogModel } from "../src/models/auditLogModel";
import BookingModel from "../src/models/bookingModel";
import userModel from "../src/models/userModel";
import {
  clearDemoFixtureActivity,
  clearFreshApplicationData,
} from "../src/services/demoResetService";
import {
  createAdmin,
  createAttendee,
  createBooking,
  createEvent,
} from "./factories";

const silent = () => {};

describe("demo reset safety", () => {
  it("validates fresh confirmation before making any write", async () => {
    await createAttendee({ email: "keep@example.test" });

    await expect(
      clearFreshApplicationData(mongoose.connection.name, "wrong-db", silent)
    ).rejects.toThrow(/Refusing to wipe/);
    await expect(userModel.countDocuments()).resolves.toBe(1);
  });

  it("removes only activity linked to known demo fixture IDs", async () => {
    const { user: demoUser } = await createAttendee();
    const { user: privateUser } = await createAttendee();
    const demoEvent = await createEvent();
    const privateEvent = await createEvent();
    const venueId = new Types.ObjectId();

    const demoBooking = await createBooking({
      userId: demoUser._id as Types.ObjectId,
      eventId: demoEvent._id as Types.ObjectId,
    });
    const privateBooking = await createBooking({
      userId: privateUser._id as Types.ObjectId,
      eventId: privateEvent._id as Types.ObjectId,
    });
    const demoAudit = await auditLogModel.create({
      action: "event.cancelled",
      actorId: demoUser._id,
      targetType: "event",
      targetId: demoEvent._id,
    });
    const privateAudit = await auditLogModel.create({
      action: "event.cancelled",
      actorId: privateUser._id,
      targetType: "event",
      targetId: privateEvent._id,
    });
    await ApprovalRequest.create({ organizerId: demoUser._id });

    await clearDemoFixtureActivity(
      {
        userIds: [demoUser._id as Types.ObjectId],
        eventIds: [demoEvent._id as Types.ObjectId],
        venueIds: [venueId],
      },
      silent
    );

    await expect(BookingModel.findById(demoBooking._id)).resolves.toBeNull();
    await expect(auditLogModel.findById(demoAudit._id)).resolves.toBeNull();
    await expect(ApprovalRequest.countDocuments()).resolves.toBe(0);
    await expect(BookingModel.findById(privateBooking._id)).resolves.not.toBeNull();
    await expect(auditLogModel.findById(privateAudit._id)).resolves.not.toBeNull();
  });

  it("fresh reset preserves trusted admins and the migration ledger", async () => {
    const { user: systemAdmin } = await createAdmin({ isSystemAdmin: true });
    await createAttendee();
    await createEvent();
    await mongoose.connection.db!.collection("migrations").insertOne({
      name: "001-demo-migration",
    });

    await clearFreshApplicationData(
      mongoose.connection.name,
      mongoose.connection.name,
      silent
    );

    await expect(userModel.countDocuments()).resolves.toBe(1);
    await expect(userModel.findById(systemAdmin._id)).resolves.not.toBeNull();
    await expect(
      mongoose.connection.db!.collection("migrations").countDocuments()
    ).resolves.toBe(1);
  });
});
