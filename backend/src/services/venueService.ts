import { Types } from "mongoose";
import venueModel, { IVenue } from "../models/venueModel";
import { httpError } from "../utils/httpError";
import { eventModel } from "../models/eventModel";
import { recordAudit } from "../models/auditLogModel";

export interface CreateVenueDTO {
  name: string;
  address: string;
  capacity: number;
  defaultLayoutType: "grid" | "freeform";
  defaultSeatMap?: Array<{ x: number; y: number; tier: string; price: number }>;
  description?: string;
  images?: string[];
}

export const createVenue = async (venueData: CreateVenueDTO) => {
  try {
    return await venueModel.create(venueData);
  } catch (err: any) {
    if (err.code === 11000) {
      throw httpError(409, "A venue with that name and address already exists");
    }
    throw err;
  }
};

export const getVenues = async () => {
  return (await venueModel.find({ isActive: true }).lean().exec()) as IVenue[];
};

export const getVenueById = async (id: string): Promise<IVenue> => {
  if (!Types.ObjectId.isValid(id)) {
    throw httpError(400, "Invalid venue ID");
  }
  const venue = await venueModel.findById(id).lean().exec();
  if (!venue) {
    throw httpError(404, "Venue not found");
  }
  return venue as IVenue;
};

export const updateVenue = async (id: string, venueData: CreateVenueDTO) => {
  if (!Types.ObjectId.isValid(id)) {
    throw httpError(400, "Invalid venue ID");
  }
  try {
    const updated = await venueModel
      .findByIdAndUpdate(id, venueData, {
        new: true,
        runValidators: true,
      })
      .lean()
      .exec();
    if (!updated) {
      throw httpError(404, "Venue not found");
    }
    return updated as IVenue;
  } catch (err: any) {
    if (err.code === 11000) {
      throw httpError(409, "A venue with that name and address already exists");
    }
    throw err;
  }
};

/**
 * Retires a venue.
 *
 * This used to be `findByIdAndDelete` with no reference check, which left every
 * event built on that template pointing at a `templateVenueId` that no longer
 * resolved — the event detail page silently lost its venue images and there was
 * no way to tell why.
 *
 * Two changes: deletion is refused while live events depend on it, and what
 * remains is a soft-disable. The `isActive` flag was already on the model, so
 * soft-delete was the original intent.
 */
export const deleteVenue = async (
  id: string,
  actorId?: string
): Promise<{ eventsAffected: number }> => {
  if (!Types.ObjectId.isValid(id)) {
    throw httpError(400, "Invalid venue ID");
  }

  const venue = await venueModel.findById(id).lean().exec();
  if (!venue) {
    throw httpError(404, "Venue not found");
  }

  // Archived events keep their reference for the historical record; only live
  // ones block removal.
  const inUse = await eventModel.countDocuments({
    templateVenueId: new Types.ObjectId(id),
    status: { $ne: "archived" },
    isCancelled: { $ne: true },
  });

  if (inUse > 0) {
    await recordAudit({
      action: "venue.delete_blocked",
      actorId,
      targetType: "venue",
      targetId: id,
      metadata: { eventsAffected: inUse },
    });

    throw httpError(
      409,
      `This venue is used by ${inUse} active event${
        inUse === 1 ? "" : "s"
      }. Cancel or archive them first.`,
      { code: "VENUE_IN_USE" }
    );
  }

  await venueModel.findByIdAndUpdate(id, { $set: { isActive: false } }).exec();

  await recordAudit({
    action: "venue.disabled",
    actorId,
    targetType: "venue",
    targetId: id,
    metadata: { name: venue.name },
  });

  return { eventsAffected: 0 };
};
