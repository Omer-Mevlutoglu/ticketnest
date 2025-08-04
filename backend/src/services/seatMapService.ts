// src/services/seatMapService.ts
import { Types } from "mongoose";
import SeatMapModel, { ISeatMap } from "../models/seatMapModel";
import { eventModel } from "../models/eventModel";
import { getEventById } from "./eventServices";

export const getSeatMap = async (eventId: string): Promise<ISeatMap> => {
  if (!Types.ObjectId.isValid(eventId)) {
    const err = new Error("Invalid event ID");
    // @ts-ignore
    err.status = 400;
    throw err;
  }

  const seatMap = await SeatMapModel.findOne({
    eventId: new Types.ObjectId(eventId),
  })
    .lean()
    .exec();

  if (!seatMap) {
    const err = new Error("Seat map not found for this event");
    // @ts-ignore
    err.status = 404;
    throw err;
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
  layoutType: "grid" | "freeform",
  userId: string,
  seats: SeatDTO[]
): Promise<ISeatMap> => {
  // 1) Validate eventId & ownership (reuse getEventById as you did)
  const event = await getEventById(eventId);
  if (event.organizerId.toString() !== userId) {
    const e = new Error("Forbidden: you don’t own this event");
    // @ts-ignore
    e.status = 403;
    throw e;
  }

  // 2) Atomic upsert with validation
  try {
    const seatMap = await SeatMapModel.findOneAndUpdate(
      { eventId: new Types.ObjectId(eventId) },
      { layoutType, seats, eventId: new Types.ObjectId(eventId) },
      { upsert: true, new: true, runValidators: true }
    ).exec() as ISeatMap;

    // 3) Link back to the Event
    await eventModel.findByIdAndUpdate(
      eventId,
      { seatMapId: seatMap._id },
      { new: false }
    ).exec();

    return seatMap;
  } catch (err: any) {
    if (err.name === "ValidationError") {
      const e = new Error("Invalid seat map data");
      // @ts-ignore
      e.status = 400;
      throw e;
    }
    if (err.code === 11000) {
      const e = new Error("Seat map already exists for this event");
      // @ts-ignore
      e.status = 409;
      throw e;
    }
    throw err;
  }
};
