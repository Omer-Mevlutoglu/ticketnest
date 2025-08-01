// src/controllers/venueController.ts
import { Request, Response, NextFunction } from "express";
import { createVenue, updateVenue } from "../services/venueService";

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
  console.log("🔶 Params:", req.params.id);
  console.log("🔶 Body:", req.body);
  // (you can also log headers, query, etc. if you need)
//   res.sendStatus(200);
    try {
      const venue = await updateVenue(req.params.id, req.body);
      return res.status(201).json(venue);
    } catch (err: any) {
      const status = err.status ?? 500;
      return res.status(status).json({ message: err.message });
    }
};
