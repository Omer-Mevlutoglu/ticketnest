import { Request, Response } from "express";
import { getOrganizerStats } from "../services/organizerService";

export const organizerStatsController = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?._id?.toString();
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const stats = await getOrganizerStats(userId);
    return res.json(stats);
  } catch (err: any) {
    const status = err.status ?? 500;
    return res.status(status).json({ message: err.message || "Server error" });
  }
};
