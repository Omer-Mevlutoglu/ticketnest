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
  /**
   * Incremented by every booking claim and by cancellation. Those operations
   * therefore contend on this document inside their transactions instead of
   * being able to commit contradictory lifecycle decisions.
   */
  lifecycleVersion: number;
  /** Stable outcome returned when cancellation is safely retried. */
  cancellationSummary?: {
    cancelledAt: Date;
    refundedBookings: number;
    releasedBookings: number;
    releasedSeats: number;
    paymentMode: "simulated";
    realRefundsProcessed: false;
  };
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
    lifecycleVersion: { type: Number, default: 0, required: true },
    cancellationSummary: {
      _id: false,
      cancelledAt: { type: Date },
      refundedBookings: { type: Number, min: 0 },
      releasedBookings: { type: Number, min: 0 },
      releasedSeats: { type: Number, min: 0 },
      paymentMode: { type: String, enum: ["simulated"] },
      realRefundsProcessed: { type: Boolean, enum: [false] },
    },
  },
  { timestamps: true }
);

// Verified with explain(): without these, both the public listing and an
// organizer's own list were a COLLSCAN followed by an in-memory SORT. The key
// order matches the query — equality fields first, then the sort field, so the
// index satisfies the filter and the ordering in one pass.
// Key order is `startTime` before `isCancelled` on purpose. The listing filters
// with `isCancelled: { $ne: true }`, and a range predicate in the middle of a
// key stops the index providing sorted output — explain() showed an in-memory
// SORT stage with `isCancelled` second. Putting the sort field there instead
// removes it; `isCancelled` still narrows the scan as a trailing key.
eventSchema.index({ status: 1, startTime: 1, isCancelled: 1 });
eventSchema.index({ organizerId: 1, createdAt: -1 });

export const eventModel = mongoose.model<IEvent>("Event", eventSchema);
