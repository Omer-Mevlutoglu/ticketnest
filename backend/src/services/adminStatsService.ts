import userModel from "../models/userModel";
import { eventModel } from "../models/eventModel";
import BookingModel from "../models/bookingModel";
import SeatMapModel from "../models/seatMapModel";
import mongoose from "mongoose";

export async function getAdminStats() {
  // Users
  const totalUsers = await userModel.countDocuments({});
  const totalAttendees = await userModel.countDocuments({ role: "attendee" });
  const totalOrganizers = await userModel.countDocuments({ role: "organizer" });
  const pendingOrganizers = await userModel.countDocuments({
    role: "organizer",
    isApproved: { $ne: true },
  });
  const approvedOrganizers = await userModel.countDocuments({
    role: "organizer",
    isApproved: true,
  });

  // Events
  const [eventsAgg] = await eventModel
    .aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          draft: {
            $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] },
          },
          published: {
            $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] },
          },
          archived: {
            $sum: { $cond: [{ $eq: ["$status", "archived"] }, 1, 0] },
          },
        },
      },
    ])
    .exec();

  // Bookings + Revenue
  const [bookingsAgg] = await BookingModel.aggregate([
    {
      $group: {
        _id: null,
        totalBookings: { $sum: 1 },
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ["$status", "paid"] }, "$total", 0],
          },
        },
        paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
        unpaid: { $sum: { $cond: [{ $eq: ["$status", "unpaid"] }, 1, 0] } },
        expired: { $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
      },
    },
  ]).exec();

  // Seats sold (sum across seat maps where status === 'sold')
  const [seatsAgg] = await SeatMapModel.aggregate([
    { $unwind: "$seats" },
    {
      $group: {
        _id: "$_id",
        sold: { $sum: { $cond: [{ $eq: ["$seats.status", "sold"] }, 1, 0] } },
        reserved: {
          $sum: { $cond: [{ $eq: ["$seats.status", "reserved"] }, 1, 0] },
        },
        available: {
          $sum: { $cond: [{ $eq: ["$seats.status", "available"] }, 1, 0] },
        },
        total: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        sold: { $sum: "$sold" },
        reserved: { $sum: "$reserved" },
        available: { $sum: "$available" },
        total: { $sum: "$total" },
      },
    },
  ]).exec();

  // Top events by paid revenue (simple top 5)
  const topEvents = await BookingModel.aggregate([
    { $match: { status: "paid" } },
    {
      $group: {
        _id: "$eventId",
        revenue: { $sum: "$total" },
        tickets: { $sum: { $size: "$items" } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: "events",
        localField: "_id",
        foreignField: "_id",
        as: "event",
      },
    },
    { $unwind: "$event" },
    {
      $project: {
        _id: 0,
        eventId: "$_id",
        title: "$event.title",
        revenue: 1,
        tickets: 1,
        startTime: "$event.startTime",
        status: "$event.status",
      },
    },
  ]).exec();

  return {
    users: {
      total: totalUsers,
      attendees: totalAttendees,
      organizers: totalOrganizers,
      approvedOrganizers,
      pendingOrganizers,
    },
    events: {
      total: eventsAgg?.total || 0,
      draft: eventsAgg?.draft || 0,
      published: eventsAgg?.published || 0,
      archived: eventsAgg?.archived || 0,
    },
    bookings: {
      total: bookingsAgg?.totalBookings || 0,
      paid: bookingsAgg?.paid || 0,
      unpaid: bookingsAgg?.unpaid || 0,
      expired: bookingsAgg?.expired || 0,
      failed: bookingsAgg?.failed || 0,
      revenue: bookingsAgg?.totalRevenue || 0,
    },
    seats: {
      total: seatsAgg?.total || 0,
      sold: seatsAgg?.sold || 0,
      reserved: seatsAgg?.reserved || 0,
      available: seatsAgg?.available || 0,
    },
    topEvents,
  };
}
