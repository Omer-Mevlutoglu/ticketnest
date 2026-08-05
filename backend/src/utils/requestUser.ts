import { Request } from "express";
import { Types } from "mongoose";
import { IUser } from "../models/userModel";
import { httpError } from "./httpError";

/**
 * Accessors for the authenticated user.
 *
 * `req.user` is optional at the type level, because it is undefined until
 * `ensureAuth` has run. These helpers turn that into either a typed user or a
 * 401 — so handlers stop repeating the same null check and stop reaching for
 * an untyped cast to read the id.
 *
 * Always `_id`, never the `id` virtual: the codebase used both, and one string
 * form everywhere is what makes comparisons reliable.
 */

/** The signed-in user, or a 401 if there is none. */
export const requireUser = (req: Request): IUser => {
  if (!req.user) throw httpError(401, "Not authenticated");
  return req.user as IUser;
};

/** The signed-in user's id as an ObjectId. */
export const requireUserId = (req: Request): Types.ObjectId =>
  requireUser(req)._id as Types.ObjectId;

/** The signed-in user's id as a string, for service calls. */
export const requireUserIdString = (req: Request): string =>
  String(requireUserId(req));
