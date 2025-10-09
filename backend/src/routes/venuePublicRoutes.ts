import { Router } from "express";
import {
  getActiveVenues,
  getVenueByIdController,
} from "../controllers/venueController";

const router = Router();

// List active venues (no auth required to read; safe)
router.get("/", getActiveVenues);
router.get("/:id", getVenueByIdController);
export default router;
