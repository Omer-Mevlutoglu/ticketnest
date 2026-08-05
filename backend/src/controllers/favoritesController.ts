import { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import userModel from "../models/userModel";
import { eventModel } from "../models/eventModel";
import { requireUserId } from "../utils/requestUser";

/**
 * Favourites.
 *
 * Mutations return the id list, which is what the star toggles are keyed on.
 * The listing returns the events themselves — the client used to receive ids
 * and then fetch each event separately, one HTTP round trip per favourite.
 */

/** Fields the favourites page renders. */
const EVENT_SUMMARY =
  "title description categories venueName venueAddress startTime endTime poster status isCancelled";

const favoriteIds = async (userId: Types.ObjectId): Promise<string[]> => {
  const user = await userModel.findById(userId, { favorites: 1 }).lean().exec();
  return (user?.favorites ?? []).map(String);
};

export const listFavorites = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUserId(req);
    const ids = await favoriteIds(userId);

    if (ids.length === 0) {
      return res.json({ ids: [], events: [] });
    }

    // One query for every favourite, filtered to what is still publicly
    // visible — a favourited event that was unpublished or cancelled should
    // not reappear here.
    const events = await eventModel
      .find({
        _id: { $in: ids.map((id) => new Types.ObjectId(id)) },
        status: "published",
        isCancelled: { $ne: true },
      })
      .select(EVENT_SUMMARY)
      .lean()
      .exec();

    // Preserve the order the user favourited them in.
    const byId = new Map(events.map((e) => [String(e._id), e]));
    return res.json({
      ids,
      events: ids.map((id) => byId.get(id)).filter(Boolean),
    });
  } catch (err) {
    return next(err);
  }
};

export const addFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUserId(req);
    const eventId = String(req.params.eventId);

    const updated = await userModel.findByIdAndUpdate(
      userId,
      { $addToSet: { favorites: new Types.ObjectId(eventId) } },
      { new: true, select: { favorites: 1 } }
    );
    return res.status(200).json((updated?.favorites ?? []).map(String));
  } catch (err) {
    return next(err);
  }
};

export const removeFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUserId(req);
    const eventId = String(req.params.eventId);

    const updated = await userModel.findByIdAndUpdate(
      userId,
      { $pull: { favorites: new Types.ObjectId(eventId) } },
      { new: true, select: { favorites: 1 } }
    );
    return res.status(200).json((updated?.favorites ?? []).map(String));
  } catch (err) {
    return next(err);
  }
};

export const toggleFavorite = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = requireUserId(req);
    const eventId = String(req.params.eventId);

    const ids = await favoriteIds(userId);
    return ids.includes(eventId)
      ? removeFavorite(req, res, next)
      : addFavorite(req, res, next);
  } catch (err) {
    return next(err);
  }
};
