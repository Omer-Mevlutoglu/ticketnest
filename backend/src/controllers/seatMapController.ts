import { NextFunction, Request, Response } from "express";
import { getSeatMap, upsertSeatMap } from "../services/seatMapService";
import SeatMapModel from "../models/seatMapModel";
import {
  generateSeatMapFromSpec,
  GridSeatMapSpec,
} from "../services/seatMapService";
import { getPublishedEventById } from "../services/eventServices";

export const getSeatMapController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // This route is public, so the event must be gated the same way the event
    // detail page is — otherwise a draft event's seat map is readable by ID.
    await getPublishedEventById(String(req.params.id));

    const seatmap = await getSeatMap(String(req.params.id));
    const now = new Date();

    const safe = {
      ...seatmap,
      seats: seatmap.seats.map((s: any) => {
        const expired =
          s.status === "reserved" &&
          s.reservedUntil &&
          new Date(s.reservedUntil) < now;
        const effectiveStatus = expired ? "available" : s.status;
        return {
          x: s.x,
          y: s.y,
          tier: s.tier,
          price: s.price,
          status: effectiveStatus,
        };
      }),
    };

    res.status(200).json(safe);
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
    const eventId = String(req.params.id);
    const userId = (req.user as any)._id.toString();
    const { layoutType, seats } = req.body;

    // 2) Delegate to service
    const seatMap = await upsertSeatMap(eventId, userId, seats);

    // 3) Respond with the updated/created seat map
    return res.status(200).json(seatMap);
  } catch (err) {
    return next(err);
  }
};

export const generateSeatMapFromSpecController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const eventId = String(req.params.id);
    const userId = (req.user as any)._id.toString();
    const spec = req.body as GridSeatMapSpec;

    const seatMap = await generateSeatMapFromSpec(eventId, userId, spec);
    return res.status(200).json(seatMap);
  } catch (err) {
    return next(err);
  }
};
