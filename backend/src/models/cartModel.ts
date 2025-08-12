// src/models/cartModel.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICartItem {
  eventId: mongoose.Types.ObjectId;
  seatCoords: { x: number; y: number };
  /** `${eventId}:${x}:${y}` for dedupe/indexing */
  seatKey: string;
  price: number;
  reservedAt: Date;
  reservedUntil: Date; // service sets now + HOLD_MS
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

// Sub-schema for coordinates (no _id)
const seatCoordsSchema = new Schema(
  {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  { _id: false }
);

const cartItemSchema = new Schema<ICartItem>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    seatCoords: { type: seatCoordsSchema, required: true },
    seatKey: { type: String, required: true }, // `${eventId}:${x}:${y}`
    price: { type: Number, required: true, min: 0 },
    reservedAt: { type: Date, required: true, default: () => new Date() },
    reservedUntil: { type: Date, required: true },
  },
  { _id: true }
);

// Auto-compute seatKey if missing
cartItemSchema.pre("validate", function (next) {
  // @ts-ignore - this refers to subdocument
  const self = this as ICartItem & { eventId: Types.ObjectId };
  if (!self.seatKey && self.eventId && self.seatCoords) {
    self.seatKey = `${self.eventId.toString()}:${self.seatCoords.x}:${
      self.seatCoords.y
    }`;
  }
  next();
});

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [cartItemSchema], default: [], required: true },
    totalPrice: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// One cart per user
cartSchema.index({ userId: 1 }, { unique: true });

// Prevent duplicate same-seat entries per user (seatKey already encodes eventId)
cartSchema.index({ userId: 1, "items.seatKey": 1 }, { unique: true });

const CartModel: Model<ICart> = mongoose.model<ICart>("Cart", cartSchema);
export default CartModel;
