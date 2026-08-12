import { NextFunction, Request, Response } from "express";
import {
  setUserApproval,
  setUserSuspension,
} from "../services/adminUserService";
import { httpError } from "../utils/httpError";
import { requireUserIdString } from "../utils/requestUser";

export const setApprovalController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { isApproved } = req.body;
    if (typeof isApproved !== "boolean") {
      throw httpError(400, "Invalid 'isApproved' value.");
    }

    const user = await setUserApproval(
      String(req.params.id),
      isApproved,
      requireUserIdString(req)
    );
    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
};

export const suspendUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await setUserSuspension(
      String(req.params.id),
      true,
      requireUserIdString(req)
    );
    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
};

export const unsuspendUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await setUserSuspension(
      String(req.params.id),
      false,
      requireUserIdString(req)
    );
    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
};
