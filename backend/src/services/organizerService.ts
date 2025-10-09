import { Types } from "mongoose";
import { eventModel } from "../models/eventModel";
import BookingModel from "../models/bookingModel";

export interface OrganizerStats {
  eventCount: number;
  publishedCount: number;
  draftCount: number;
  archivedCount: number;
  upcomingCount: number;
  // paid bookings only
  totalRevenue: number; 
  ticketsSold: number; 
}

export const getOrganizerStats = async (
  organizerId: string
): Promise<OrganizerStats> => {
  const orgId = new Types.ObjectId(organizerId);
  const now = new Date();

  // fetch organizer events
  const events = await eventModel
    .find({ organizerId: orgId })
    .select("_id status startTime")
    .lean()
    .exec();

  const eventIds = events.map((e) => e._id);
  const eventCount = events.length;
  const publishedCount = events.filter((e) => e.status === "published").length;
  const draftCount = events.filter((e) => e.status === "draft").length;
  const archivedCount = events.filter((e) => e.status === "archived").length;
  const upcomingCount = events.filter(
    (e) => e.status === "published" && e.startTime && e.startTime > now
  ).length;

  if (eventIds.length === 0) {
    return {
      eventCount,
      publishedCount,
      draftCount,
      archivedCount,
      upcomingCount,
      totalRevenue: 0,
      ticketsSold: 0,
    };
  }

  // aggregate paid bookings for these events
  const agg = await BookingModel.aggregate([
    { $match: { eventId: { $in: eventIds }, status: "paid" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$items.price" },
        ticketsSold: { $sum: 1 },
      },
    },
  ]);

  const totalRevenue = agg[0]?.totalRevenue || 0;
  const ticketsSold = agg[0]?.ticketsSold || 0;

  return {
    eventCount,
    publishedCount,
    draftCount,
    archivedCount,
    upcomingCount,
    totalRevenue,
    ticketsSold,
  };
};
