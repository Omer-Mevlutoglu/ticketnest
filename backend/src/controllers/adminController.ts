import { Request, Response, NextFunction } from "express";
import {
  getPendingRequests,
  approveRequest,
  rejectRequest,
} from "../services/approvalService";

export const listPendingOrganizers = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pending = await getPendingRequests();
    res.json(pending);
  } catch (err) {
    next(err);
  }
};

export const approveOrganizer = async (
  req: Request<{ organizerId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizerId } = req.params;
    const updated = await approveRequest(organizerId);
    if (!updated) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json({ message: "Organizer approved", request: updated });
  } catch (err) {
    next(err);
  }
};

export const rejectOrganizer = async (
  req: Request<{ organizerId: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizerId } = req.params;
    const updated = await rejectRequest(organizerId);
    if (!updated) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json({ message: "Organizer rejected", request: updated });
  } catch (err) {
    next(err);
  }
};
