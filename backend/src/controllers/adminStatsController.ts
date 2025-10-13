import { Request, Response } from "express";
import { getAdminStats } from "../services/adminStatsService";

export const getStatsController = async (req: Request, res: Response) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ message: err?.message || "Failed to load stats" });
  }
};
