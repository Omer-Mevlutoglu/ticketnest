import mongoose, { Types } from "mongoose";
import BookingModel from "../models/bookingModel";
import { eventModel } from "../models/eventModel";
import SeatMapModel, { ISeatMap } from "../models/seatMapModel";
import type { GenerateSeatMapInput } from "../validation/schemas";
import { httpError } from "../utils/httpError";

export const getSeatMap = async (eventId: string): Promise<ISeatMap> => {
  if (!Types.ObjectId.isValid(eventId)) {
    throw httpError(400, "Invalid event ID");
  }

  const seatMap = await SeatMapModel.findOne({
    eventId: new Types.ObjectId(eventId),
  })
    .lean<ISeatMap>()
    .exec();

  if (!seatMap) {
    throw httpError(404, "Seat map not found for this event");
  }

  return seatMap;
};

export interface SeatDTO {
  x: number;
  y: number;
  tier: string;
  price: number;
  status: "available" | "reserved" | "sold";
}

const seatMapLocked = (message: string) =>
  httpError(409, message, { code: "SEAT_MAP_LOCKED" });

/**
 * Creates or structurally replaces a custom event's seat map.
 *
 * The event write is part of the same transaction as the map replacement. That
 * makes publication contend on the event document: either this draft update
 * commits first, or publication wins and the transaction retries against the
 * now-locked lifecycle state.
 */
export const upsertSeatMap = async (
  eventId: string,
  userId: string,
  seats: SeatDTO[]
): Promise<ISeatMap> => {
  if (!Types.ObjectId.isValid(eventId)) {
    throw httpError(400, "Invalid event ID");
  }

  const eventOid = new Types.ObjectId(eventId);
  const organizerOid = new Types.ObjectId(userId);
  const session = await mongoose.startSession();
  let result: ISeatMap | null = null;

  try {
    await session.withTransaction(async () => {
      const event = await eventModel.findById(eventOid).session(session);
      if (!event) throw httpError(404, "Event not found");
      if (event.organizerId.toString() !== userId) {
        throw httpError(403, "Forbidden: you don't own this event");
      }
      if (event.venueType !== "custom") {
        throw seatMapLocked(
          "Template venue seat maps are managed by their venue template."
        );
      }
      if (event.status !== "draft" || event.isCancelled) {
        throw seatMapLocked(
          "Seat-map structure is locked after the event leaves draft."
        );
      }

      const [bookingExists, currentSeatMap] = await Promise.all([
        BookingModel.exists({ eventId: eventOid }).session(session),
        SeatMapModel.findOne({ eventId: eventOid })
          .select("seats.status")
          .session(session),
      ]);

      if (bookingExists) {
        throw seatMapLocked(
          "Seat-map structure is locked because booking history exists."
        );
      }
      if (currentSeatMap?.seats.some((seat) => seat.status !== "available")) {
        throw seatMapLocked(
          "Seat-map structure is locked because inventory is active."
        );
      }

      const seatMap = await SeatMapModel.findOneAndUpdate(
        { eventId: eventOid },
        { layoutType: "grid", seats, eventId: eventOid },
        { upsert: true, new: true, runValidators: true, session }
      ).exec();

      const linked = await eventModel.updateOne(
        {
          _id: eventOid,
          organizerId: organizerOid,
          status: "draft",
          isCancelled: { $ne: true },
        },
        { $set: { seatMapId: seatMap._id } },
        { session }
      );

      if (linked.matchedCount !== 1) {
        throw seatMapLocked(
          "Seat-map structure was locked while it was being updated."
        );
      }

      result = seatMap;
    });
  } catch (error: unknown) {
    const shaped = error as { name?: string; code?: number };
    if (shaped.name === "ValidationError") {
      throw httpError(400, "Invalid seat map data");
    }
    if (shaped.code === 11000) {
      throw httpError(409, "Seat map already exists for this event");
    }
    throw error;
  } finally {
    await session.endSession();
  }

  if (!result) {
    throw new Error("Seat-map transaction completed without a result");
  }
  return result;
};

export type GridSeatMapSpec = GenerateSeatMapInput;

const MAX_DIM = 200;

const assertIntInRange = (
  name: string,
  value: unknown,
  min: number,
  max: number
) => {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw httpError(
      400,
      `${name} must be an integer between ${min} and ${max}`
    );
  }
};

const assertPrice = (name: string, value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw httpError(400, `${name} must be a non-negative number`);
  }
};

export const buildGridSeats = (spec: GridSeatMapSpec): SeatDTO[] => {
  assertIntInRange("rows", spec.rows, 1, MAX_DIM);
  assertIntInRange("cols", spec.cols, 1, MAX_DIM);

  if (!spec.default || typeof spec.default.tier !== "string") {
    throw httpError(400, "default.tier is required");
  }
  assertPrice("default.price", spec.default.price);

  const tierByRow = new Map<number, { tier: string; price: number }>();
  for (let row = 1; row <= spec.rows; row += 1) {
    tierByRow.set(row, {
      tier: spec.default.tier,
      price: spec.default.price,
    });
  }

  for (const rule of spec.rules ?? []) {
    for (const row of rule.rows) {
      tierByRow.set(row, { tier: rule.tier, price: rule.price });
    }
  }

  const blocked = new Set(
    (spec.blockedSeats ?? []).map((seat) => `${seat.x},${seat.y}`)
  );
  const overrides = new Map(
    (spec.seatOverrides ?? []).map((seat) => [
      `${seat.x},${seat.y}`,
      { tier: seat.tier, price: seat.price },
    ])
  );

  const seats: SeatDTO[] = [];
  for (let x = 1; x <= spec.rows; x += 1) {
    const { tier, price } = tierByRow.get(x)!;
    for (let y = 1; y <= spec.cols; y += 1) {
      if (blocked.has(`${x},${y}`)) continue;
      const seatPrice = overrides.get(`${x},${y}`) ?? { tier, price };
      seats.push({ x, y, ...seatPrice, status: "available" });
    }
  }

  return seats;
};

export const generateSeatMapFromSpec = async (
  eventId: string,
  userId: string,
  spec: GridSeatMapSpec
): Promise<ISeatMap> => upsertSeatMap(eventId, userId, buildGridSeats(spec));
