import { Types } from "mongoose";
import venueModel, { IVenue } from "../models/venueModel";

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
      const e = new Error("A venue with that name and address already exists");
      // @ts-ignore
      e.status = 409;
      throw e;
    }
    throw err;
  }
};

export const getVenues = async () => {
  return (await venueModel.find({ isActive: true }).lean().exec()) as IVenue[];
};

export const getVenueById = async (id: string): Promise<IVenue> => {
  if (!Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid venue ID");
    // @ts-ignore
    err.status = 400;
    throw err;
  }
  const venue = await venueModel.findById(id).lean().exec();
  if (!venue) {
    const err = new Error("Venue not found");
    // @ts-ignore
    err.status = 404;
    throw err;
  }
  return venue as IVenue;
};

export const updateVenue = async (id: string, venueData: CreateVenueDTO) => {
  if (!Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid venue ID");
    // @ts-ignore
    err.status = 400;
    throw err;
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
      const err = new Error("Venue not found");
      // @ts-ignore
      err.status = 404;
      throw err;
    }
    return updated as IVenue;
  } catch (err: any) {
    if (err.code === 11000) {
      const e = new Error("A venue with that name and address already exists");
      // @ts-ignore
      e.status = 409;
      throw e;
    }
    throw err;
  }
};

export const deleteVenue = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    const err = new Error("Invalid venue ID");
    // @ts-ignore
    err.status = 400;
    throw err;
  }
  const result = await venueModel.findByIdAndDelete(id).exec();
  if (!result) {
    const err = new Error("Venue not found");
    // @ts-ignore
    err.status = 404;
    throw err;
  }
};
