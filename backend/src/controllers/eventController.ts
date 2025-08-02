// src/controllers/eventController.ts
import { Request, Response, NextFunction } from "express";
import {
  createEvent,
  getEventById,
  listEvents,
} from "../services/eventServices";

export const createEventController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as any;
    if (!user || !user._id) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    console.log(user._id.toString());
    const dto = {
      ...req.body,
      organizerId: user._id.toString(),
    };
    const event = await createEvent(dto);
    return res.status(201).json(event);
  } catch (error: any) {
    const status = error.status ?? 500;
    return res.status(status).json({ message: error.message });
  }
};

export const listPublicEvents = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const events = await listEvents({
      status: "published",
      upcomingOnly: true,
    });
    return res.status(200).json(events);
  } catch (err: any) {
    return next(err);
  }
};

export const listMyEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as any;
    const events = await listEvents({ organizerId: user.id.toString() });
    return res.status(200).json(events);
  } catch (err: any) {
    return next(err);
  }
};

export const listAllEvents = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const events = await listEvents({});
    return res.status(200).json(events);
  } catch (err: any) {
    return next(err);
  }
};

export const getMyEventById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user as any;
    const event = await getEventById(req.params.id);

    // Confirm they own it
    if (event.organizerId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return res.status(200).json(event);
  } catch (err: any) {
    return next(err);
  }
};
export const getPublicEventById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const event = await getEventById(req.params.id);

    // only allow published (and maybe past) events
    if (event.status !== "published") {
      return res.status(404).json({ message: "Event not found" });
    }
    return res.status(200).json(event);
  } catch (err: any) {
    return next(err);
  }
};
