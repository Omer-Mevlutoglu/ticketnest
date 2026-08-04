import { NextFunction, Request, Response } from "express";
import { getOrganizerStats } from "../services/organizerService";
import { httpError } from "../utils/httpError";

export const organizerStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req.user as any)?._id?.toString();
    if (!userId) throw httpError(401, "Unauthorized");

    const stats = await getOrganizerStats(userId);
    return res.json(stats);
  } catch (err) {
    return next(err);
  }
};
