import userModel from "../models/userModel";
import { eventModel } from "../models/eventModel";
import BookingModel from "../models/bookingModel";
import SeatMapModel from "../models/seatMapModel";

export async function getAdminStats() {
  /*
   * Run all independent aggregations concurrently.
   *
   * Before:
   * 9 mostly sequential MongoDB operations
   *
   * After:
   * 5 concurrent MongoDB operations
   */
  const [usersResult, eventsResult, bookingsResult, seatsResult, topEvents] =
    await Promise.all([
      // ============================================================
      // Users
      // ============================================================
      userModel
        .aggregate([
          {
            $group: {
              _id: null,

              total: {
                $sum: 1,
              },

              attendees: {
                $sum: {
                  $cond: [{ $eq: ["$role", "attendee"] }, 1, 0],
                },
              },

              organizers: {
                $sum: {
                  $cond: [{ $eq: ["$role", "organizer"] }, 1, 0],
                },
              },

              approvedOrganizers: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$role", "organizer"] },
                        { $eq: ["$isApproved", true] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },

              pendingOrganizers: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ["$role", "organizer"] },
                        {
                          $ne: [{ $ifNull: ["$isApproved", false] }, true],
                        },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ])
        .exec(),

      // ============================================================
      // Events
      // ============================================================
      eventModel
        .aggregate([
          {
            $group: {
              _id: null,

              total: {
                $sum: 1,
              },

              draft: {
                $sum: {
                  $cond: [{ $eq: ["$status", "draft"] }, 1, 0],
                },
              },

              published: {
                $sum: {
                  $cond: [{ $eq: ["$status", "published"] }, 1, 0],
                },
              },

              archived: {
                $sum: {
                  $cond: [{ $eq: ["$status", "archived"] }, 1, 0],
                },
              },
            },
          },
        ])
        .exec(),

      // ============================================================
      // Bookings + Revenue
      // ============================================================
      BookingModel.aggregate([
        {
          $group: {
            _id: null,

            totalBookings: {
              $sum: 1,
            },

            totalRevenue: {
              $sum: {
                $cond: [{ $eq: ["$status", "paid"] }, "$total", 0],
              },
            },

            paid: {
              $sum: {
                $cond: [{ $eq: ["$status", "paid"] }, 1, 0],
              },
            },

            unpaid: {
              $sum: {
                $cond: [{ $eq: ["$status", "unpaid"] }, 1, 0],
              },
            },

            expired: {
              $sum: {
                $cond: [{ $eq: ["$status", "expired"] }, 1, 0],
              },
            },

            failed: {
              $sum: {
                $cond: [{ $eq: ["$status", "failed"] }, 1, 0],
              },
            },
          },
        },
      ]).exec(),

      // ============================================================
      // Seats
      //
      // Avoid $unwind.
      // Count statuses directly inside each seats array.
      // ============================================================
      SeatMapModel.aggregate([
        {
          $project: {
            total: {
              $size: {
                $ifNull: ["$seats", []],
              },
            },

            sold: {
              $size: {
                $filter: {
                  input: {
                    $ifNull: ["$seats", []],
                  },
                  as: "seat",
                  cond: {
                    $eq: ["$$seat.status", "sold"],
                  },
                },
              },
            },

            reserved: {
              $size: {
                $filter: {
                  input: {
                    $ifNull: ["$seats", []],
                  },
                  as: "seat",
                  cond: {
                    $eq: ["$$seat.status", "reserved"],
                  },
                },
              },
            },

            available: {
              $size: {
                $filter: {
                  input: {
                    $ifNull: ["$seats", []],
                  },
                  as: "seat",
                  cond: {
                    $eq: ["$$seat.status", "available"],
                  },
                },
              },
            },
          },
        },

        {
          $group: {
            _id: null,

            total: {
              $sum: "$total",
            },

            sold: {
              $sum: "$sold",
            },

            reserved: {
              $sum: "$reserved",
            },

            available: {
              $sum: "$available",
            },
          },
        },
      ]).exec(),

      // ============================================================
      // Top 5 Events by Paid Revenue
      // ============================================================
      BookingModel.aggregate([
        {
          $match: {
            status: "paid",
          },
        },

        {
          $group: {
            _id: "$eventId",

            revenue: {
              $sum: "$total",
            },

            tickets: {
              $sum: {
                $size: {
                  $ifNull: ["$items", []],
                },
              },
            },
          },
        },

        {
          $sort: {
            revenue: -1,
          },
        },

        {
          $limit: 5,
        },

        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "_id",
            as: "event",
          },
        },

        {
          $unwind: "$event",
        },

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
      ]).exec(),
    ]);

  const usersAgg = usersResult[0];
  const eventsAgg = eventsResult[0];
  const bookingsAgg = bookingsResult[0];
  const seatsAgg = seatsResult[0];

  return {
    users: {
      total: usersAgg?.total ?? 0,
      attendees: usersAgg?.attendees ?? 0,
      organizers: usersAgg?.organizers ?? 0,
      approvedOrganizers: usersAgg?.approvedOrganizers ?? 0,
      pendingOrganizers: usersAgg?.pendingOrganizers ?? 0,
    },

    events: {
      total: eventsAgg?.total ?? 0,
      draft: eventsAgg?.draft ?? 0,
      published: eventsAgg?.published ?? 0,
      archived: eventsAgg?.archived ?? 0,
    },

    bookings: {
      total: bookingsAgg?.totalBookings ?? 0,
      paid: bookingsAgg?.paid ?? 0,
      unpaid: bookingsAgg?.unpaid ?? 0,
      expired: bookingsAgg?.expired ?? 0,
      failed: bookingsAgg?.failed ?? 0,
      revenue: bookingsAgg?.totalRevenue ?? 0,
    },

    seats: {
      total: seatsAgg?.total ?? 0,
      sold: seatsAgg?.sold ?? 0,
      reserved: seatsAgg?.reserved ?? 0,
      available: seatsAgg?.available ?? 0,
    },

    topEvents,
  };
}
