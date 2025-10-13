import { Request, Response } from "express";
import userModel from "../models/userModel";
import { Types } from "mongoose";

export const listFavorites = async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;
  const user = await userModel.findById(userId, { favorites: 1 }).lean().exec();
  res.json(user?.favorites ?? []);
};

export const addFavorite = async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;
  const { eventId } = req.params;

  if (!Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  const updated = await userModel.findByIdAndUpdate(
    userId,
    { $addToSet: { favorites: new Types.ObjectId(eventId) } },
    { new: true, select: { favorites: 1 } }
  );
  res.status(200).json(updated?.favorites ?? []);
};

export const removeFavorite = async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;
  const { eventId } = req.params;

  if (!Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  const updated = await userModel.findByIdAndUpdate(
    userId,
    { $pull: { favorites: new Types.ObjectId(eventId) } },
    { new: true, select: { favorites: 1 } }
  );
  res.status(200).json(updated?.favorites ?? []);
};

// optional: convenience toggle
export const toggleFavorite = async (req: Request, res: Response) => {
  const userId = (req.user as any)._id;
  const { eventId } = req.params;
  if (!Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }
  const user = await userModel.findById(userId, { favorites: 1 }).lean();
  const has = user?.favorites?.some((id) => id.toString() === eventId);
  if (has) return removeFavorite(req, res);
  return addFavorite(req, res);
};
