import { Request, Response, NextFunction } from "express";
import BookingModel from "../models/bookingModel";

export const listAllBookingsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query as { status?: string };

    const query: any = {};
    if (status) query.status = status;

    const bookings = await BookingModel.find(query)
      .populate("userId", "email username role")
      .populate(
        "eventId",
        "title startTime endTime venueName venueAddress poster"
      )
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    res.status(200).json(bookings);
  } catch (err) {
    next(err);
  }
};
