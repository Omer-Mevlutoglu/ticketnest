import { Request, Response, NextFunction } from "express";
import {
  createEvent,
  deleteEvent,
  getEventById,
  getPublishedEventById,
  listEventsPage,
  updateEvent,
} from "../services/eventServices";
import { requireUser, requireUserIdString } from "../utils/requestUser";
import { validatedQuery } from "../middleware/validate";
import { PaginationInput } from "../validation/schemas";

export const createEventController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = requireUser(req);
    if (!user || !user._id) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const dto = {
      ...req.body,
      organizerId: user._id.toString(),
    };
    const event = await createEvent(dto);
    return res.status(201).json(event);
  } catch (err) {
    return next(err);
  }
};

export const listPublicEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = await listEventsPage(
      { status: "published" },
      validatedQuery<PaginationInput>(req)
    );
    return res.status(200).json(page);
  } catch (err) {
    return next(err);
  }
};

export const listMyEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // `_id`, not the `id` virtual — one form everywhere (C10).
    const page = await listEventsPage(
      { organizerId: requireUserIdString(req) },
      validatedQuery<PaginationInput>(req)
    );
    return res.status(200).json(page);
  } catch (err) {
    return next(err);
  }
};

export const listAllEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = await listEventsPage({}, validatedQuery<PaginationInput>(req));
    return res.status(200).json(page);
  } catch (err) {
    return next(err);
  }
};

export const getMyEventById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = requireUser(req);
    const event = await getEventById(String(req.params.id));

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
    // Published and not cancelled — the cancelled check was missing, so a
    // cancelled event stayed publicly readable.
    const event = await getPublishedEventById(String(req.params.id));
    return res.status(200).json(event);
  } catch (err) {
    return next(err);
  }
};

export const updateEventController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract the authenticated user’s ID
    const userId = requireUserIdString(req);

    // Delegate to service (which now checks ownership internally)
    const event = await updateEvent(String(req.params.id), req.body, userId);

    return res.status(200).json(event);
  } catch (err) {
    return next(err);
  }
};

export const deleteEventController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUserIdString(req);
    const cancellation = await deleteEvent(String(req.params.id), userId);
    return res.status(200).json({
      message: cancellation.alreadyCancelled
        ? "Event was already cancelled"
        : "Event cancelled successfully",
      cancellation,
    });
  } catch (err) {
    return next(err);
  }
};
