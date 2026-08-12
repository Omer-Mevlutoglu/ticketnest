import { Request, Response, NextFunction } from "express";
import { requireUserIdString } from "../utils/requestUser";
import {
  createVenue,
  deleteVenue,
  getVenueById,
  getVenues,
  updateVenue,
} from "../services/venueService";

export const createVenueController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const venue = await createVenue(req.body);

    return res.status(201).json(venue);
  } catch (err) {
    return next(err);
  }
};

export const updateVenueController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const venue = await updateVenue(String(req.params.id), req.body);
    return res.status(200).json(venue);
  } catch (err) {
    return next(err);
  }
};

export const getActiveVenues = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const allActiveVenue = await getVenues();
    res.status(200).json(allActiveVenue);
  } catch (err) {
    return next(err);
  }
};

export const getVenueByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const venue = await getVenueById(String(req.params.id));
    return res.status(200).json(venue);
  } catch (err) {
    return next(err);
  }
};

export const deleteVenueController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await deleteVenue(String(req.params.id), requireUserIdString(req));
    return res.status(200).json({ message: "Venue deleted successfully" });
  } catch (err) {
    return next(err);
  }
};
