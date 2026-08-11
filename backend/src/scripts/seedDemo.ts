import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../configs/db";
import userModel from "../models/userModel";
import { eventModel } from "../models/eventModel";
import venueModel from "../models/venueModel";
import SeatMapModel from "../models/seatMapModel";
import { hashPassword } from "../utils/helperHash";
import {
  clearDemoFixtureActivity,
  clearFreshApplicationData,
} from "../services/demoResetService";

dotenv.config();

const DEMO_PASSWORD = "DemoPassword123!";
const DEMO_ACCOUNTS = [
  { username: "demo-attendee", email: "attendee@demo.ticketnest", role: "attendee" },
  { username: "demo-organizer", email: "organizer@demo.ticketnest", role: "organizer" },
  { username: "demo-admin", email: "admin@demo.ticketnest", role: "admin" },
] as const;

const buildGrid = (
  rows: number,
  cols: number,
  premiumRows: number,
  premiumPrice: number,
  standardPrice: number
) =>
  Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ({
      x,
      y,
      tier: y < premiumRows ? "premium" : "standard",
      price: y < premiumRows ? premiumPrice : standardPrice,
    }))
  ).flat();

const DEMO_VENUES = [
  {
    name: "The Demo Hall",
    address: "1 Example Street, Demo City",
    capacity: 60,
    description: "A mid-sized hall used by the demo events.",
    seatMap: buildGrid(6, 10, 2, 120, 60),
  },
  {
    name: "Riverside Theatre",
    address: "42 Waterfront Road, Demo City",
    capacity: 40,
    description: "A smaller theatre with a premium front row.",
    seatMap: buildGrid(5, 8, 1, 150, 75),
  },
] as const;

const DEMO_EVENTS = [
  {
    title: "TicketNest Demo — Live Seat Selection",
    description: "Try seat selection, the hold countdown, and simulated checkout.",
    categories: ["demo"],
    venueIndex: 0,
    startsInDays: 14,
  },
  {
    title: "Midnight Jazz Quartet",
    description: "A late-night set with a premium front row.",
    categories: ["music", "jazz"],
    venueIndex: 1,
    startsInDays: 21,
  },
  {
    title: "Autumn Comedy Night",
    description: "Four comedians, one stage, and a two-hour set.",
    categories: ["comedy"],
    venueIndex: 0,
    startsInDays: 30,
  },
] as const;

const parseArgs = () => {
  const argv = process.argv.slice(2);
  const flagIndex = argv.indexOf("--confirm");
  const inline = argv.find((arg) => arg.startsWith("--confirm="));
  return {
    fresh: argv.includes("--fresh"),
    confirm: inline
      ? inline.slice("--confirm=".length)
      : flagIndex >= 0
        ? argv[flagIndex + 1]
        : undefined,
  };
};

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const seedDemo = async () => {
  const { fresh, confirm } = parseArgs();
  await connectDB();
  const dbName = mongoose.connection.name;

  if (fresh) await clearFreshApplicationData(dbName, confirm);
  console.log(`Seeding demo data into "${dbName}"...`);

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const accountIds: Record<string, mongoose.Types.ObjectId> = {};
  for (const account of DEMO_ACCOUNTS) {
    const existing = await userModel.findOne({ email: account.email });
    if (existing?.isSystemAdmin) {
      throw new Error(
        `Refusing to replace trusted system admin ${account.email} with a demo account.`
      );
    }

    const user = await userModel.findOneAndUpdate(
      { email: account.email },
      {
        $set: {
          ...account,
          passwordHash,
          emailVerified: true,
          isApproved: true,
          isSuspended: false,
          mustChangePassword: false,
          isSystemAdmin: false,
          isDemoAccount: true,
        },
        $inc: { sessionVersion: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    accountIds[account.role] = user._id as mongoose.Types.ObjectId;
  }

  const venueIds: mongoose.Types.ObjectId[] = [];
  for (const venue of DEMO_VENUES) {
    const saved = await venueModel.findOneAndUpdate(
      { name: venue.name, address: venue.address },
      {
        $set: {
          name: venue.name,
          address: venue.address,
          capacity: venue.capacity,
          description: venue.description,
          defaultLayoutType: "grid",
          defaultSeatMap: venue.seatMap,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    venueIds.push(saved._id as mongoose.Types.ObjectId);
  }

  const savedEvents: Array<{
    id: mongoose.Types.ObjectId;
    venueIndex: number;
  }> = [];
  for (const event of DEMO_EVENTS) {
    const venue = DEMO_VENUES[event.venueIndex];
    const startTime = daysFromNow(event.startsInDays);
    const saved = await eventModel.findOneAndUpdate(
      { title: event.title, organizerId: accountIds.organizer },
      {
        $set: {
          title: event.title,
          description: event.description,
          categories: event.categories,
          status: "published",
          organizerId: accountIds.organizer,
          venueType: "template",
          templateVenueId: venueIds[event.venueIndex],
          venueName: venue.name,
          venueAddress: venue.address,
          startTime,
          endTime: new Date(startTime.getTime() + 3 * 60 * 60 * 1000),
          isCancelled: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    savedEvents.push({
      id: saved._id as mongoose.Types.ObjectId,
      venueIndex: event.venueIndex,
    });
  }

  const cleared = await clearDemoFixtureActivity({
    userIds: Object.values(accountIds),
    eventIds: savedEvents.map((event) => event.id),
    venueIds,
  });

  for (const event of savedEvents) {
    const seats = DEMO_VENUES[event.venueIndex].seatMap.map((seat) => ({
      ...seat,
      status: "available" as const,
    }));
    const seatMap = await SeatMapModel.findOneAndUpdate(
      { eventId: event.id },
      { $set: { eventId: event.id, layoutType: "grid", seats } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await eventModel.updateOne(
      { _id: event.id },
      { $set: { seatMapId: seatMap._id } }
    );
  }

  console.log(`Cleared ${cleared.bookings} demo booking(s).`);
  console.log(`Done. All demo accounts use: ${DEMO_PASSWORD}`);
  await mongoose.connection.close();
};

seedDemo().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
