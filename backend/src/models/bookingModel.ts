// src/models/bookingModel.ts
import { Schema, model, Document, Types } from "mongoose";

export type BookingStatus =
  | "unpaid"
  | "paid"
  | "failed"
  | "expired"
  | "refunded";

export interface IBookingItem {
  seatCoords: { x: number; y: number };
  price: number;
}

export interface IBooking extends Document {
  userId: Types.ObjectId;
  eventId: Types.ObjectId;
  items: IBookingItem[];
  total: number;
  status: BookingStatus;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const bookingItemSchema = new Schema<IBookingItem>(
  {
    seatCoords: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const bookingSchema = new Schema<IBooking>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    items: { type: [bookingItemSchema], required: true, default: [] },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["unpaid", "paid", "failed", "expired", "refunded"],
      default: "unpaid",
      required: true,
    },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, expiresAt: 1 });

export default model<IBooking>("Booking", bookingSchema);
