// src/models/seatMapModel.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ISeatMap extends Document {
  eventId: Types.ObjectId;
  layoutType: "grid" | "freeform";
  seats: Array<{
    x: number;
    y: number;
    tier: string;
    price: number;
    status: "available" | "reserved" | "sold";
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Sub‐schema for individual seats
const seatSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    tier: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["available", "reserved", "sold"],
      default: "available",
      required: true,
    },
  },
  { _id: false }
);

const seatMapSchema = new Schema<ISeatMap>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    layoutType: {
      type: String,
      enum: ["grid", "freeform"],
      required: true,
    },
    seats: {
      type: [seatSchema],
      default: [],
      required: true,
    },
  },
  { timestamps: true }
);

const SeatMapModel = mongoose.model<ISeatMap>("SeatMap", seatMapSchema);

export default SeatMapModel;
