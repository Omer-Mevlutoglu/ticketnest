import { Request, Response, NextFunction } from "express";
import BookingModel from "../models/bookingModel";
import { validatedQuery } from "../middleware/validate";
import { AdminBookingQueryInput } from "../validation/schemas";
import { paginate } from "../utils/pagination";

export const listAllBookingsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, page, limit } = validatedQuery<AdminBookingQueryInput>(req);

    const result = await paginate(BookingModel, {
      filter: status ? { status } : {},
      page,
      limit,
      // Matches the (status, createdAt) index added for this listing.
      sort: { createdAt: -1 },
      populate: [
        { path: "userId", select: "email username role" },
        {
          path: "eventId",
          select: "title startTime endTime venueName venueAddress poster",
        },
      ],
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
