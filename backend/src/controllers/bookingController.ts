import { Request, Response, NextFunction } from "express";
import {
  cancelBooking,
  createBookingFromSelection,
  finalizeFailedBooking,
  finalizePaidBooking,
  getMyBookings,
} from "../services/bookingService";

export const createBookingController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)._id.toString();
    const booking = await createBookingFromSelection(userId, req.body);
    return res.status(201).json(booking);
  } catch (err: any) {
    const status = err.status ?? 500;
    return res.status(status).json({ message: err.message });
  }
};

export const listMyBookingsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)._id.toString();
    const bookings = await getMyBookings(userId);
    return res.status(200).json(bookings);
  } catch (err) {
    next(err);
  }
};

export const cancelBookingController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)._id.toString();
    await cancelBooking(userId, req.params.id);
    return res.status(200).json({ message: "Booking cancelled" });
  } catch (err: any) {
    const status = err.status ?? 500;
    return res.status(status).json({ message: err.message });
  }
};

// Manual “mark paid” (for testing without Stripe)
export const markPaidController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // verify ownership here if you want only the owner to mark paid during tests
    await finalizePaidBooking(req.params.id);
    return res.status(200).json({ message: "Booking marked as PAID" });
  } catch (err: any) {
    const status = err.status ?? 500;
    return res.status(status).json({ message: err.message });
  }
};

// Manual “mark failed” (for testing)
export const markFailedController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await finalizeFailedBooking(req.params.id);
    return res.status(200).json({ message: "Booking marked as FAILED" });
  } catch (err: any) {
    const status = err.status ?? 500;
    return res.status(status).json({ message: err.message });
  }
};
