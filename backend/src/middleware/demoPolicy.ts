import { NextFunction, Request, Response } from "express";
import { isDemoMode } from "../configs/features";
import { requireUser } from "../utils/requestUser";
import { httpError } from "../utils/httpError";

/**
 * Protects privileged writes in the hosted portfolio deployment.
 *
 * Normal/self-hosted mode is unchanged. In demo mode, only an administrator
 * reconciled from private ADMIN_EMAILS may pass; every organizer is blocked,
 * including newly registered accounts, so changing email cannot bypass it.
 */
export const requireDemoWriteAccess = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!isDemoMode()) return next();

  const user = requireUser(req);
  if (user.role === "admin" && user.isSystemAdmin === true) return next();

  return next(
    httpError(
      403,
      "This operation is protected in the hosted portfolio demo. Clone the project with DEMO_MODE=false to use the complete workflow.",
      { code: "DEMO_RESTRICTED" }
    )
  );
};

const privateAlias = (id: unknown) => {
  const suffix = String(id ?? "visitor").slice(-6);
  return {
    id: `demo-visitor-${suffix}`,
    username: `Demo visitor ${suffix}`,
    email: `visitor-${suffix}@private.invalid`,
  };
};

/** Recursively strips server markers and masks non-fixture user identities. */
const sanitize = (value: unknown, maskPrivate: boolean): unknown => {
  if (Array.isArray(value)) return value.map((item) => sanitize(item, maskPrivate));
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  const looksLikeUser =
    typeof source.email === "string" &&
    (typeof source.username === "string" || typeof source.role === "string");
  const shouldMask =
    maskPrivate && looksLikeUser && source.isDemoAccount !== true;
  const alias = shouldMask ? privateAlias(source._id ?? source.id) : null;

  for (const [key, child] of Object.entries(source)) {
    if (key === "isSystemAdmin" || key === "isDemoAccount") continue;
    if (alias && (key === "_id" || key === "id")) output[key] = alias.id;
    else if (alias && key === "email") output.email = alias.email;
    else if (alias && key === "username") output.username = alias.username;
    else output[key] = sanitize(child, maskPrivate);
  }

  return output;
};

/** Sanitizes admin responses and applies privacy masking for the demo admin. */
export const sanitizeDemoAdminResponses = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalJson = res.json.bind(res);
  const user = requireUser(req);
  const maskPrivate =
    isDemoMode() && !(user.role === "admin" && user.isSystemAdmin === true);

  res.json = ((body: unknown) => {
    const serialized = JSON.stringify(body);
    if (serialized === undefined) return originalJson(body);
    return originalJson(sanitize(JSON.parse(serialized), maskPrivate));
  }) as Response["json"];
  next();
};
