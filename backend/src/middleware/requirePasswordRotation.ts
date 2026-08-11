import { NextFunction, Request, Response } from "express";
import { requireUser } from "../utils/requestUser";
import { httpError } from "../utils/httpError";

/** Blocks seeded admins from privileged routes until they own the credential. */
export const requirePasswordRotationComplete = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const user = requireUser(req);
  if (user.role !== "admin" || user.mustChangePassword !== true) return next();

  return next(
    httpError(
      403,
      "Change the bootstrap password before using administrator operations.",
      { code: "PASSWORD_CHANGE_REQUIRED" }
    )
  );
};
