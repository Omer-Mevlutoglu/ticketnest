import mongoose, { Types } from "mongoose";
import BookingModel from "../models/bookingModel";
import ApprovalRequest from "../models/approvalRequest";
import { auditLogModel } from "../models/auditLogModel";

const APP_COLLECTIONS = [
  "users",
  "events",
  "seatmaps",
  "bookings",
  "venues",
  "approvalrequests",
  "auditlogs",
  "sessions",
] as const;

export type DemoFixtureScope = {
  userIds: Types.ObjectId[];
  eventIds: Types.ObjectId[];
  venueIds: Types.ObjectId[];
};

export const assertFreshConfirmation = (
  dbName: string,
  confirmation: string | undefined
) => {
  if (confirmation === dbName) return;
  throw new Error(
    `Refusing to wipe.\n\n` +
      `  Connected to: "${dbName}"\n` +
      `  You confirmed: ${confirmation ? `"${confirmation}"` : "(nothing)"}\n\n` +
      `Re-run with: npm run seed:demo -- --fresh --confirm ${dbName}`
  );
};

/** Clear a confirmed disposable database, preserving migrations and private admins. */
export const clearFreshApplicationData = async (
  dbName: string,
  confirmation: string | undefined,
  log: (line: string) => void = console.log
) => {
  assertFreshConfirmation(dbName, confirmation);
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB is not connected");

  const existing = new Set(
    (await db.listCollections().toArray()).map((collection) => collection.name)
  );
  const counts: Record<string, number> = {};
  for (const name of APP_COLLECTIONS) {
    if (!existing.has(name)) continue;
    const filter = name === "users" ? { isSystemAdmin: { $ne: true } } : {};
    counts[name] = await db.collection(name).countDocuments(filter);
  }

  log(`Reset preview for "${dbName}": ${JSON.stringify(counts)}`);
  for (const name of APP_COLLECTIONS) {
    if (!existing.has(name)) continue;
    const filter = name === "users" ? { isSystemAdmin: { $ne: true } } : {};
    const result = await db.collection(name).deleteMany(filter);
    log(`${name}: ${result.deletedCount} document(s) removed`);
  }
  return counts;
};

/** Remove activity owned by, or targeting, only the known demo fixtures. */
export const clearDemoFixtureActivity = async (
  scope: DemoFixtureScope,
  log: (line: string) => void = console.log
) => {
  const bookingFilter = {
    $or: [
      { userId: { $in: scope.userIds } },
      { eventId: { $in: scope.eventIds } },
    ],
  };
  const auditFilter = {
    $or: [
      { actorId: { $in: scope.userIds } },
      { targetId: { $in: [...scope.userIds, ...scope.eventIds, ...scope.venueIds] } },
    ],
  };
  const approvalFilter = { organizerId: { $in: scope.userIds } };
  const preview = {
    bookings: await BookingModel.countDocuments(bookingFilter),
    auditLogs: await auditLogModel.countDocuments(auditFilter),
    approvalRequests: await ApprovalRequest.countDocuments(approvalFilter),
  };
  log(`Demo reset preview: ${JSON.stringify(preview)}`);

  const [bookings, auditLogs, approvalRequests] = await Promise.all([
    BookingModel.deleteMany(bookingFilter),
    auditLogModel.deleteMany(auditFilter),
    ApprovalRequest.deleteMany(approvalFilter),
  ]);
  return {
    bookings: bookings.deletedCount,
    auditLogs: auditLogs.deletedCount,
    approvalRequests: approvalRequests.deletedCount,
  };
};
