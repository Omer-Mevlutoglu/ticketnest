import { Types } from "mongoose";
import SeatMapModel, { ISeatMap } from "../models/seatMapModel";
import { eventModel } from "../models/eventModel";
import { getEventById } from "./eventServices";
import { httpError } from "../utils/httpError";

export const getSeatMap = async (eventId: string): Promise<ISeatMap> => {
  if (!Types.ObjectId.isValid(eventId)) {
    throw httpError(400, "Invalid event ID");
  }

  const seatMap = await SeatMapModel.findOne({
    eventId: new Types.ObjectId(eventId),
  })
    .lean()
    .exec();

  if (!seatMap) {
    throw httpError(404, "Seat map not found for this event");
  }

  return seatMap as ISeatMap;
};

export interface SeatDTO {
  x: number;
  y: number;
  tier: string;
  price: number;
  status: "available" | "reserved" | "sold";
}

export const upsertSeatMap = async (
  eventId: string,
  userId: string,
  seats: SeatDTO[]
): Promise<ISeatMap> => {
  // 1) Validate eventId & ownership (reuse getEventById as you did)
  const event = await getEventById(eventId);
  if (event.organizerId.toString() !== userId) {
    throw httpError(403, "Forbidden: you don’t own this event");
  }

  // 2) Atomic upsert with validation
  try {
    const seatMap = (await SeatMapModel.findOneAndUpdate(
      { eventId: new Types.ObjectId(eventId) },
      { layoutType: "grid", seats, eventId: new Types.ObjectId(eventId) },
      { upsert: true, new: true, runValidators: true }
    ).exec()) as ISeatMap;

    // 3) Link back to the Event
    await eventModel
      .findByIdAndUpdate(eventId, { seatMapId: seatMap._id }, { new: false })
      .exec();

    return seatMap;
  } catch (err: any) {
    if (err.name === "ValidationError") {
      throw httpError(400, "Invalid seat map data");
    }
    if (err.code === 11000) {
      throw httpError(409, "Seat map already exists for this event");
    }
    throw err;
  }
};

// --- Seat-map generator spec (GRID ONLY) ---
export interface GridSeatMapSpec {
  rows: number; // e.g., 10
  cols: number; // e.g., 12
  default: { tier: string; price: number };
  /**
   * Optional per-row overrides. Each rule applies to all seats in those rows.
   * Example: [{ rows: [1,2,3], tier: "VIP", price: 120 }]
   */
  rules?: Array<{ rows: number[]; tier: string; price: number }>;
  /**
   * Optional seats to exclude entirely (e.g., pillars)
   * Example: [{ x: 5, y: 9 }]
   */
  blockedSeats?: Array<{ x: number; y: number }>;
}

const MAX_DIM = 200;

const assertIntInRange = (name: string, val: any, min: number, max: number) => {
  if (!Number.isInteger(val) || val < min || val > max) {
    throw httpError(
      400,
      `${name} must be an integer between ${min} and ${max}`
    );
  }
};

const assertPrice = (name: string, val: any) => {
  if (typeof val !== "number" || !Number.isFinite(val) || val < 0) {
    throw httpError(400, `${name} must be a non-negative number`);
  }
};

export const buildGridSeats = (spec: GridSeatMapSpec): SeatDTO[] => {
  // Validate base spec
  assertIntInRange("rows", spec.rows, 1, MAX_DIM);
  assertIntInRange("cols", spec.cols, 1, MAX_DIM);

  if (!spec.default || typeof spec.default.tier !== "string") {
    throw httpError(400, "default.tier is required");
  }
  assertPrice("default.price", spec.default.price);

  // Normalize rules
  const tierByRow = new Map<number, { tier: string; price: number }>();
  for (let r = 1; r <= spec.rows; r++) {
    tierByRow.set(r, { tier: spec.default.tier, price: spec.default.price });
  }

  if (spec.rules && Array.isArray(spec.rules)) {
    for (const rule of spec.rules) {
      if (
        !rule ||
        !Array.isArray(rule.rows) ||
        rule.rows.some((n) => !Number.isInteger(n))
      ) {
        throw httpError(400, "Each rule.rows must be an array of integers");
      }
      if (typeof rule.tier !== "string") {
        throw httpError(400, "Each rule.tier must be a string");
      }
      assertPrice("rule.price", rule.price);

      for (const r of rule.rows) {
        if (r >= 1 && r <= spec.rows) {
          tierByRow.set(r, { tier: rule.tier, price: rule.price });
        }
      }
    }
  }

  // Blocked seats lookup
  const blocked = new Set<string>();
  if (spec.blockedSeats && Array.isArray(spec.blockedSeats)) {
    for (const b of spec.blockedSeats) {
      if (
        !b ||
        !Number.isInteger(b.x) ||
        !Number.isInteger(b.y) ||
        b.x < 1 ||
        b.x > spec.rows ||
        b.y < 1 ||
        b.y > spec.cols
      ) {
        throw httpError(
          400,
          `blockedSeats contains out-of-bounds or invalid coordinate: (${b?.x},${b?.y})`
        );
      }
      blocked.add(`${b.x},${b.y}`);
    }
  }

  // Build seats
  const seats: SeatDTO[] = [];
  for (let x = 1; x <= spec.rows; x++) {
    const { tier, price } = tierByRow.get(x)!;
    for (let y = 1; y <= spec.cols; y++) {
      if (blocked.has(`${x},${y}`)) continue;
      seats.push({
        x,
        y,
        tier,
        price,
        status: "available",
      });
    }
  }

  return seats;
};

export const generateSeatMapFromSpec = async (
  eventId: string,
  userId: string,
  spec: GridSeatMapSpec
): Promise<ISeatMap> => {
  // Build the seats array from spec
  const seats = buildGridSeats(spec);

  // Call your normal upsert function (grid enforced inside)
  // If your upsert signature is still (eventId, layoutType, userId, seats)
  // change the next line to: return upsertSeatMap(eventId, "grid", userId, seats);
  return upsertSeatMap(eventId, userId, seats);
};
