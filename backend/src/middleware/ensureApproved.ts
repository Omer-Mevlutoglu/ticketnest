// src/middleware/ensureApproved.ts
import { Request, Response, NextFunction } from "express";

export const ensureApproved = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Passport puts the user on req.user
  const user = req.user as any;

  // Only organizers need approval
  if (user.role === "organizer" && !user.isApproved) {
    return res
      .status(403)
      .json({ message: "Your organizer account is pending admin approval" });
  }

  // Attendees and admins pass through
  return next();
};
