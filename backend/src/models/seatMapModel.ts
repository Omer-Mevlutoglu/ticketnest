// src/models/seatMapModel.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ISeat {
  x: number;
  y: number;
  tier: string;
  price: number;
  status: "available" | "reserved" | "sold";
  reservedBy?: Types.ObjectId; // who holds it (if reserved)
  reservedUntil?: Date; // hold expiry (if reserved)
}

export interface ISeatMap extends Document {
  eventId: Types.ObjectId;
  layoutType: "grid";
  seats: ISeat[];
  createdAt: Date;
  updatedAt: Date;
}

const seatSchema = new Schema<ISeat>(
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
    reservedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reservedUntil: { type: Date },
  },
  { _id: false }
);

const seatMapSchema = new Schema<ISeatMap>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
    },
    layoutType: {
      type: String,
      enum: ["grid"],
      default: "grid",
      required: true,
    },
    seats: {
      type: [seatSchema],
      default: [],
      required: true,
      validate: {
        validator: (seats: ISeat[]) => {
          const coords = seats.map((s) => `${s.x},${s.y}`);
          return new Set(coords).size === coords.length;
        },
        message: "Seat coordinates must be unique within a map",
      },
    },
  },
  { timestamps: true }
);

// Helpful indexes
seatMapSchema.index({ eventId: 1 }, { unique: true });
seatMapSchema.index({ "seats.status": 1 });
seatMapSchema.index({ "seats.reservedUntil": 1 });
seatMapSchema.index({ "seats.reservedBy": 1 });

const SeatMapModel: Model<ISeatMap> = mongoose.model<ISeatMap>(
  "SeatMap",
  seatMapSchema
);

export default SeatMapModel;
