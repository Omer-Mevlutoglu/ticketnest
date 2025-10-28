import mongoose, { Schema, Document } from "mongoose";

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
  poster?: string;
  isCancelled: boolean;
}

const eventSchema = new Schema<IEvent>(
  {
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
    venueType: { type: String, enum: ["custom", "template"], required: true },
    templateVenueId: {
      type: Schema.Types.ObjectId,
      ref: "venue",
    },
    venueName: { type: String },
    venueAddress: { type: String },
    seatMapId: {
      type: Schema.Types.ObjectId,
      ref: "SeatMap",
    },
    poster: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    isCancelled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const eventModel = mongoose.model<IEvent>("Event", eventSchema);
