// src/controllers/venueController.ts
import { Request, Response, NextFunction } from "express";
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
  } catch (err: any) {
    const status = err.status ?? 500;
    return res.status(status).json({ message: err.message });
  }
};

export const updateVenueController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const venue = await updateVenue(req.params.id, req.body);
    return res.status(200).json(venue);
  } catch (err: any) {
    const status = err.status ?? 500;
    return res.status(status).json({ message: err.message });
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
  } catch (error: any) {
    const status = error.status ?? 500;
    return res.status(status).json({ message: error.message });
  }
};

export const getVenueByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const venue = await getVenueById(req.params.id);
    return res.status(200).json(venue);
  } catch (err: any) {
    const status = err.status ?? 500;
    return res.status(status).json({ message: err.message });
  }
};

export const deleteVenueController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await deleteVenue(req.params.id);
    return res.status(200).json({ message: "Venue deleted successfully" });
  } catch (err: any) {
    const status = err.status ?? 500;
    return res.status(status).json({ message: err.message });
  }
};
