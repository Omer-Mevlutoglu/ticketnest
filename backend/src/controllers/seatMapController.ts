import { NextFunction, Request, Response } from "express";
import { getSeatMap, upsertSeatMap } from "../services/seatMapService";
import SeatMapModel from "../models/seatMapModel";
import {
  generateSeatMapFromSpec,
  GridSeatMapSpec,
} from "../services/seatMapService";
import { getEventById, getPublishedEventById } from "../services/eventServices";
import { requireUserIdString } from "../utils/requestUser";
import { httpError } from "../utils/httpError";

const publicSeatMap = (seatmap: Awaited<ReturnType<typeof getSeatMap>>) => {
  const now = new Date();
  return {
    ...seatmap,
    seats: seatmap.seats.map((seat) => {
      const expired =
        seat.status === "reserved" &&
        seat.reservedUntil &&
        new Date(seat.reservedUntil) < now;
      return {
        x: seat.x,
        y: seat.y,
        tier: seat.tier,
        price: seat.price,
        status: expired ? "available" : seat.status,
      };
    }),
  };
};

export const getSeatMapController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // This route is public, so the event must be gated the same way the event
    // detail page is — otherwise a draft event's seat map is readable by ID.
    await getPublishedEventById(String(req.params.id));

    res
      .status(200)
      .json(publicSeatMap(await getSeatMap(String(req.params.id))));
  } catch (error: any) {
    return next(error);
  }
};

export const getMySeatMapController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const eventId = String(req.params.id);
    const event = await getEventById(eventId);
    if (event.organizerId.toString() !== requireUserIdString(req)) {
      return next(httpError(403, "Forbidden: you don't own this event"));
    }

    return res.status(200).json(publicSeatMap(await getSeatMap(eventId)));
  } catch (error) {
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
    const userId = requireUserIdString(req);
    const { seats } = req.body;

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
    const userId = requireUserIdString(req);
    const spec = req.body as GridSeatMapSpec;

    const seatMap = await generateSeatMapFromSpec(eventId, userId, spec);
    return res.status(200).json(seatMap);
  } catch (err) {
    return next(err);
  }
};
