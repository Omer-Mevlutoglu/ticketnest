import { NextFunction, Request, Response } from "express";
import { isMockPaymentsEnabled } from "../configs/features";
import { httpError } from "../utils/httpError";

/**
 * Gates the simulated-payment endpoints behind `ENABLE_MOCK_PAYMENTS`.
 *
 * Responds 404 rather than 403 when disabled: a deployment that has switched to
 * a real provider should not advertise that these routes ever existed.
 *
 * The flag is read per request instead of at mount time so the route table has
 * one shape and the behaviour stays honest under test.
 */
export const requireMockPayments = (
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!isMockPaymentsEnabled()) {
    return next(httpError(404, "Not Found"));
  }
  return next();
};
