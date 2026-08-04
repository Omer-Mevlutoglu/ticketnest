import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../configs/db";
import userModel from "../models/userModel";
import { eventModel } from "../models/eventModel";
import SeatMapModel from "../models/seatMapModel";
import BookingModel from "../models/bookingModel";
import { hashPassword } from "../utils/helperHash";

dotenv.config();

/**
 * Seeds the public demo: one account per role, plus a published event with a
 * seat map to book against.
 *
 * Run with `npm run seed:demo`. Idempotent — it resets the demo accounts and
 * event to a known state rather than accumulating duplicates, so it can be put
 * on a schedule to keep the demo clean.
 *
 * The passwords here are intentionally public. This script must only ever run
 * against a demo database; it refuses to touch anything that is not clearly one.
 */

const DEMO_PASSWORD = "DemoPassword123!";

const DEMO_ACCOUNTS = [
  { username: "demo-attendee", email: "attendee@demo.ticketnest", role: "attendee" },
  { username: "demo-organizer", email: "organizer@demo.ticketnest", role: "organizer" },
  { username: "demo-admin", email: "admin@demo.ticketnest", role: "admin" },
] as const;

const DEMO_EVENT_TITLE = "TicketNest Demo — Live Seat Selection";

const seedDemo = async () => {
  await connectDB();

  const dbName = mongoose.connection.name;
  console.log(`Seeding demo data into "${dbName}"…`);

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const created: Record<string, mongoose.Types.ObjectId> = {};

  for (const account of DEMO_ACCOUNTS) {
    const user = await userModel.findOneAndUpdate(
      { email: account.email },
      {
        $set: {
          username: account.username,
          email: account.email,
          passwordHash,
          role: account.role,
          emailVerified: true,
          isApproved: true,
          isSuspended: false,
          mustChangePassword: false,
        },
        // Reset every session for the demo accounts on each run.
        $inc: { sessionVersion: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    created[account.role] = user._id as mongoose.Types.ObjectId;
    console.log(`  ✓ ${account.role.padEnd(9)} ${account.email}`);
  }

  // One published event, seat map wiped back to fully available.
  const startTime = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const event = await eventModel.findOneAndUpdate(
    { title: DEMO_EVENT_TITLE },
    {
      $set: {
        title: DEMO_EVENT_TITLE,
        description:
          "A demo event for trying the seat-selection flow. Pick seats, watch the ten-minute hold count down, and complete the simulated checkout.",
        categories: ["demo"],
        status: "published",
        organizerId: created.organizer,
        venueType: "custom",
        venueName: "The Demo Hall",
        venueAddress: "1 Example Street",
        startTime,
        endTime: new Date(startTime.getTime() + 3 * 60 * 60 * 1000),
        isCancelled: false,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const rows = 6;
  const cols = 10;
  const seats = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ({
      x,
      y,
      tier: y < 2 ? "premium" : "standard",
      price: y < 2 ? 120 : 60,
      status: "available" as const,
    }))
  ).flat();

  const seatMap = await SeatMapModel.findOneAndUpdate(
    { eventId: event._id },
    { $set: { eventId: event._id, layoutType: "grid", seats } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await eventModel.updateOne(
    { _id: event._id },
    { $set: { seatMapId: seatMap._id } }
  );

  // Clear bookings held by demo accounts so the map starts empty.
  const removed = await BookingModel.deleteMany({
    userId: { $in: Object.values(created) },
  });

  console.log(`  ✓ event      ${event.title}`);
  console.log(`  ✓ seat map   ${rows}x${cols} seats, all available`);
  console.log(`  ✓ cleared    ${removed.deletedCount} demo booking(s)`);
  console.log(`\nAll demo accounts use the password: ${DEMO_PASSWORD}`);

  await mongoose.connection.close();
};

seedDemo().catch(async (err) => {
  console.error("Demo seeding failed:", err);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
