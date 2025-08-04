import { NextFunction, Request, Response } from "express";
import { getSeatMap, upsertSeatMap } from "../services/seatMapService";
import SeatMapModel from "../models/seatMapModel";

export const getSeatMapController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const seatmap = await getSeatMap(req.params.id);
    res.status(200).json(seatmap);
  } catch (error: any) {
    return next(error);
  }
};

export const upsertSeatMapController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1) Extract and cast
    const eventId = req.params.id;
    const userId = (req.user as any)._id.toString();
    const { layoutType, seats } = req.body;

    // 2) Delegate to service
    const seatMap = await upsertSeatMap(eventId, layoutType, userId, seats);

    // 3) Respond with the updated/created seat map
    return res.status(200).json(seatMap);
  } catch (err: any) {
    // 4) Forward HTTP status from service or default to 500
    const status = err.status ?? 500;
    return res.status(status).json({ message: err.message });
  }
};
