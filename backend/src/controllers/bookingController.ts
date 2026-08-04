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
  } catch (err) {
    return next(err);
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
  } catch (err) {
    return next(err);
  }
};

// Simulated payment success.
//
// The amount is never taken from the request: the booking's stored total is the
// only source of truth, so a crafted body cannot change what is charged or what
// is marked paid. Ownership is enforced in the service, inside the transaction.
export const markPaidController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)._id.toString();
    await finalizePaidBooking(req.params.id, userId);
    return res.status(200).json({ message: "Booking marked as PAID" });
  } catch (err) {
    return next(err);
  }
};

// Simulated payment failure. Same ownership and state guards as above.
export const markFailedController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)._id.toString();
    await finalizeFailedBooking(req.params.id, userId);
    return res.status(200).json({ message: "Booking marked as FAILED" });
  } catch (err) {
    return next(err);
  }
};
