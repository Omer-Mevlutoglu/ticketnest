import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../configs/db";
import userModel from "../models/userModel";
import { eventModel } from "../models/eventModel";
import venueModel from "../models/venueModel";
import SeatMapModel from "../models/seatMapModel";
import BookingModel from "../models/bookingModel";
import { auditLogModel } from "../models/auditLogModel";
import { hashPassword } from "../utils/helperHash";

dotenv.config();

/**
 * Seeds the public demo: one account per role, two template venues, and three
 * published events with seat maps to book against.
 *
 *   npm run seed:demo
 *       Upserts the demo data. Non-destructive: anything else in the database
 *       is left alone. Safe to re-run, and safe to schedule.
 *
 *   npm run seed:demo -- --fresh --confirm <databaseName>
 *       Wipes every application collection first, leaving a database that
 *       contains the demo data and nothing else. The database name must be
 *       repeated back exactly — that is the guard against pointing this at the
 *       wrong cluster.
 *
 * The passwords here are intentionally public. Never point this at a database
 * holding real accounts.
 */

const DEMO_PASSWORD = "DemoPassword123!";

const DEMO_ACCOUNTS = [
  { username: "demo-attendee", email: "attendee@demo.ticketnest", role: "attendee" },
  { username: "demo-organizer", email: "organizer@demo.ticketnest", role: "organizer" },
  { username: "demo-admin", email: "admin@demo.ticketnest", role: "admin" },
] as const;

/**
 * Collections the reset clears.
 *
 * `migrations` is deliberately absent: wiping it would make every migration
 * pending again and `/readyz` would report the service unready until they were
 * re-run, for no benefit — there would be no rows left to migrate.
 */
const APP_COLLECTIONS = [
  "users",
  "events",
  "seatmaps",
  "bookings",
  "venues",
  "approvalrequests",
  "auditlogs",
  "sessions",
];

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
    description:
      "A mid-sized hall used by the demo events. Six rows of ten seats.",
    seatMap: buildGrid(6, 10, 2, 120, 60),
  },
  {
    name: "Riverside Theatre",
    address: "42 Waterfront Road, Demo City",
    capacity: 40,
    description: "A smaller theatre with a single premium row at the front.",
    seatMap: buildGrid(5, 8, 1, 150, 75),
  },
];

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const DEMO_EVENTS = [
  {
    title: "TicketNest Demo — Live Seat Selection",
    description:
      "The event to try the seat-selection flow on. Pick seats, watch the ten-minute hold count down, and complete the simulated checkout.",
    categories: ["demo"],
    venueIndex: 0,
    startsInDays: 14,
  },
  {
    title: "Midnight Jazz Quartet",
    description:
      "A late-night set in the Riverside Theatre. Premium row at the front.",
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
];

/** Parses `--fresh` and `--confirm <name>` off the command line. */
const parseArgs = () => {
  const argv = process.argv.slice(2);
  const fresh = argv.includes("--fresh");

  const flagIndex = argv.indexOf("--confirm");
  const inline = argv.find((a) => a.startsWith("--confirm="));
  const confirm = inline
    ? inline.split("=")[1]
    : flagIndex !== -1
      ? argv[flagIndex + 1]
      : undefined;

  return { fresh, confirm };
};

const wipe = async (dbName: string, confirm: string | undefined) => {
  if (confirm !== dbName) {
    throw new Error(
      `Refusing to wipe.\n\n` +
        `  Connected to: "${dbName}"\n` +
        `  You confirmed: ${confirm ? `"${confirm}"` : "(nothing)"}\n\n` +
        `Re-run with:  npm run seed:demo -- --fresh --confirm ${dbName}\n\n` +
        `This exists so a mistyped connection string cannot silently destroy ` +
        `the wrong database.`
    );
  }

  console.log(`\n⚠️  Clearing application data from "${dbName}"…`);

  const existing = await mongoose.connection.db!
    .listCollections()
    .toArray()
    .then((cols) => new Set(cols.map((c) => c.name)));

  for (const name of APP_COLLECTIONS) {
    if (!existing.has(name)) continue;
    const { deletedCount } = await mongoose.connection.db!
      .collection(name)
      .deleteMany({});
    console.log(`  ✓ ${name.padEnd(18)} ${deletedCount} document(s) removed`);
  }
};

const seedDemo = async () => {
  const { fresh, confirm } = parseArgs();

  await connectDB();
  const dbName = mongoose.connection.name;

  if (fresh) {
    await wipe(dbName, confirm);
  }

  console.log(`\nSeeding demo data into "${dbName}"…\n`);

  // --- accounts ---------------------------------------------------------
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const accountIds: Record<string, mongoose.Types.ObjectId> = {};

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
        // Ends any session left open by a previous visitor to the demo.
        $inc: { sessionVersion: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    accountIds[account.role] = user._id as mongoose.Types.ObjectId;
    console.log(`  ✓ ${account.role.padEnd(10)} ${account.email}`);
  }

  // --- venues -----------------------------------------------------------
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
    console.log(
      `  ✓ venue      ${venue.name} (${venue.seatMap.length} seats)`
    );
  }

  // --- events and their seat maps --------------------------------------
  for (const event of DEMO_EVENTS) {
    const venue = DEMO_VENUES[event.venueIndex];
    const venueId = venueIds[event.venueIndex];
    const startTime = daysFromNow(event.startsInDays);

    const saved = await eventModel.findOneAndUpdate(
      { title: event.title },
      {
        $set: {
          title: event.title,
          description: event.description,
          categories: event.categories,
          status: "published",
          organizerId: accountIds.organizer,
          venueType: "template",
          templateVenueId: venueId,
          venueName: venue.name,
          venueAddress: venue.address,
          startTime,
          endTime: new Date(startTime.getTime() + 3 * 60 * 60 * 1000),
          isCancelled: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Every seat back to available, so the demo starts empty each time.
    const seatMap = await SeatMapModel.findOneAndUpdate(
      { eventId: saved._id },
      {
        $set: {
          eventId: saved._id,
          layoutType: "grid",
          seats: venue.seatMap.map((seat) => ({
            ...seat,
            status: "available" as const,
          })),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await eventModel.updateOne(
      { _id: saved._id },
      { $set: { seatMapId: seatMap._id } }
    );

    console.log(
      `  ✓ event      ${event.title} — ${venue.seatMap.length} seats, all available`
    );
  }

  // --- clear bookings ---------------------------------------------------
  // A non-fresh run still resets the demo: stale holds would otherwise leave
  // seats locked for ten minutes after the last visitor left.
  const removed = await BookingModel.deleteMany({});
  const audits = await auditLogModel.deleteMany({});

  console.log(`  ✓ cleared    ${removed.deletedCount} booking(s)`);
  console.log(`  ✓ cleared    ${audits.deletedCount} audit entr(ies)`);

  console.log(`\nDone. All demo accounts use the password: ${DEMO_PASSWORD}\n`);

  await mongoose.connection.close();
};

seedDemo().catch(async (err) => {
  console.error(`\n${err instanceof Error ? err.message : String(err)}\n`);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
