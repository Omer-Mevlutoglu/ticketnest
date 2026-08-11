import { NextFunction, Request, Response } from "express";
import { getAdminStats } from "../services/adminStatsService";

export const getStatsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
};
