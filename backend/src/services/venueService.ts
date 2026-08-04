import { Types } from "mongoose";
import venueModel, { IVenue } from "../models/venueModel";
import { httpError } from "../utils/httpError";

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

export const deleteVenue = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw httpError(400, "Invalid venue ID");
  }
  const result = await venueModel.findByIdAndDelete(id).exec();
  if (!result) {
    throw httpError(404, "Venue not found");
  }
};
