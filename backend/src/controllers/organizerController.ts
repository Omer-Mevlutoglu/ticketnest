import { NextFunction, Request, Response } from "express";
import { getOrganizerStats } from "../services/organizerService";
import { httpError } from "../utils/httpError";
import { requireUserIdString } from "../utils/requestUser";

export const organizerStatsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUserIdString(req);
    if (!userId) throw httpError(401, "Unauthorized");

    const stats = await getOrganizerStats(userId);
    return res.json(stats);
  } catch (err) {
    return next(err);
  }
};
