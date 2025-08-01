import { Schema, Document, model } from "mongoose";

export interface IVenue extends Document {
  name: string;
  address: string;
  capacity: number;
  defaultLayoutType: "grid" | "freeform";
  defaultSeatMap?: Array<{ x: number; y: number; tier: string; price: number }>;
  description?: string;
  images?: Array<string>;
  isActive: boolean;
}

const venueSchema = new Schema<IVenue>(
  {
    name: { type: String, required: true },
    address: { type: String, required: true },
    capacity: { type: Number, required: true, min: 1 },
    defaultLayoutType: {
      type: String,
      required: true,
      enum: ["grid", "freeform"],
    },
    defaultSeatMap: [
      {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        tier: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    description: { type: String, required: true, default: "" },
    images: [{ type: String, required: true }],
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);
venueSchema.index({ name: 1, address: 1 }, { unique: true });
export default model<IVenue>("Venue", venueSchema);
