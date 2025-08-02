import mongoose, { Schema, Document } from "mongoose";
import { title } from "process";

export interface IEvent extends Document {
  title: string;
  description: string;
  categories: string[];
  status: "draft" | "published" | "archived";
  organizerId: mongoose.Types.ObjectId;
  venueType: "custom" | "template";
  templateVenueId?: mongoose.Types.ObjectId;
  venueName?: string;
  venueAddress?: string;
  seatMapId?: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  categories: { type: [String], default: [] },
  status: {
    type: String,
    enum: ["draft", "published", "archived"],
    default: "draft",
    required: true,
  },
  organizerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  venueType: { type: String, enum: ["Custom", "template"], required: true },
  templateVenueId: {
    type: Schema.Types.ObjectId,
    ref: "venues",
  },
  venueName: { type: String },
  venueAddress: { type: String },
  seatMapId: {
    type: Schema.Types.ObjectId,
    ref: "seatMap",
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
});

export const eventModel = mongoose.model<IEvent>("Events", eventSchema);
