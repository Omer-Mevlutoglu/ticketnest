import { Request, Response, NextFunction } from "express";

/**
 * Blocks requests unless the user is authenticated and has one of the allowed roles.
 */
export const ensureRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Must be logged in
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Must have one of the allowed roles
    const user = req.user as any;
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};
