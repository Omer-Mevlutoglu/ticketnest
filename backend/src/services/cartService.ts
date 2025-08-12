import CartModel, { ICart } from "../models/cartModel";
import mongoose, { Types } from "mongoose";
import SeatMapModel from "../models/seatMapModel";

interface CreateCartForUser {
  userId: string;
}

export const createCartForUser = async ({ userId }: CreateCartForUser) => {
  const cart = await CartModel.create({
    userId,
    items: [],
    totalPrice: 0,
  });
  await cart.save();
  return cart;
};

const getCartByUserId = async (userId: string) => {
  const cart = await CartModel.findOne({ userId }).populate("items.eventId");
  if (!cart) {
    await createCartForUser({ userId });
  }
  return cart;
};

export interface AddItemToCartParams {
  userId: string;
  eventId: string;
  seatCoords: { x: number; y: number };
  price: number;
}

export const addItemToCart = async ({
  userId,
  eventId,
  seatCoords,
  price,
}: AddItemToCartParams): Promise<ICart> => {
  // 1) Validate eventId
  if (!Types.ObjectId.isValid(eventId)) {
    const e = new Error("Invalid event ID");
    // @ts-ignore
    e.status = 400;
    throw e;
  }
  const oid = new Types.ObjectId(eventId);

  // 2) Atomically reserve the seat in the map
  const seatMap = await SeatMapModel.findOneAndUpdate(
    {
      eventId: oid,
      "seats.x": seatCoords.x,
      "seats.y": seatCoords.y,
      "seats.status": "available",
    },
    { $set: { "seats.$.status": "reserved" } },
    { new: true }
  ).exec();

  if (!seatMap) {
    const e = new Error("Seat is no longer available or map not found");
    // @ts-ignore
    e.status = 400;
    throw e;
  }

  // 3) Load (or create) the user's cart
  const cart = await getCartByUserId(userId);

  if (!cart) {
    const e = new Error("Cart not found for user");
    // @ts-ignore
    e.status = 404;
    throw e;
  }

  const duplicate = cart.items.find(
    (item) =>
      item.eventId.toString() === eventId &&
      item.seatCoords.x === seatCoords.x &&
      item.seatCoords.y === seatCoords.y
  );
  if (duplicate) {
    const e = new Error("That seat is already in your cart");
    // @ts-ignore
    e.status = 409;
    throw e;
  }

  // 5) Add to cart & recalc total
  cart.items.push({
    eventId: oid,
    seatCoords,
    price,
    reservedAt: new Date(),
    seatKey: "",
    reservedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes hold
  });
  cart.totalPrice = cart.items.reduce((sum, i) => sum + i.price, 0);

  // 6) Save & return
  await cart.save();
  return cart;
};
