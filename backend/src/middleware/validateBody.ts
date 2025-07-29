// src/middleware/validateBody.ts
import { Request, Response, NextFunction } from "express";

type Rule =
  | { field: string; type: "string" }
  | { field: string; type: "email" }
  | { field: string; type: "enum"; options: any[] }
  | { field: string; type: "minLength"; length: number };

export const validateBody = (rules: Rule[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const rule of rules) {
      const val = req.body[rule.field];

      // 1) Required
      if (val === undefined || val === null || val === "") {
        errors.push(`${rule.field} is required`);
        continue;
      }

      // 2) Type checks
      switch (rule.type) {
        case "string":
          if (typeof val !== "string") {
            errors.push(`${rule.field} must be a string`);
          }
          break;
        case "email":
          if (
            typeof val !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
          ) {
            errors.push(`${rule.field} must be a valid email`);
          }
          break;
        case "minLength":
          if (typeof val !== "string" || val.length < rule.length) {
            errors.push(
              `${rule.field} must be at least ${rule.length} characters`
            );
          }
          break;
        case "enum":
          if (!rule.options.includes(val)) {
            errors.push(
              `${rule.field} must be one of: ${rule.options.join(", ")}`
            );
          }
          break;
      }
    }

    if (errors.length) {
      return res.status(400).json({ errors });
    }
    next();
  };
};
