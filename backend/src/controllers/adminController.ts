import { Request, Response, NextFunction } from "express";
import {
  getPendingRequests,
  approveRequest,
  rejectRequest,
} from "../services/approvalService";
import { requireUserIdString } from "../utils/requestUser";

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
    const updated = await approveRequest(
      organizerId,
      requireUserIdString(req)
    );
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
    const updated = await rejectRequest(
      organizerId,
      requireUserIdString(req)
    );
    res.json({ message: "Organizer rejected", request: updated });
  } catch (err) {
    next(err);
  }
};
