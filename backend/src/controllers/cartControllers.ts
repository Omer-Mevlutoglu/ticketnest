// src/controllers/cartController.ts
import { Request, Response, NextFunction } from "express";
import { addItemToCart } from "../services/cartService";
import { IUser } from "../models/userModel";

export const addItemToCartController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1) Extract the authenticated user’s ID (Passport puts the user on req.user)
    const user = req.user as IUser;
    const userId = (user._id as any).toString();

    // 2) Destructure only the fields we expect
    const { eventId, seatCoords, price } = req.body;
    // console.log("Adding item to cart:", { userId, eventId, seatCoords, price });
    // 3) Delegate to the service
    const updatedCart = await addItemToCart({
      userId,
      eventId,
      seatCoords,
      price,
    });

    // 4) Return the updated cart
    return res.status(200).json(updatedCart);
  } catch (err: any) {
    // Forward service‐set status or default to 500
    return res.status(err.status ?? 500).json({ message: err.message });
  }
};
