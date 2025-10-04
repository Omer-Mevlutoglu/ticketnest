import { Router } from "express";
import { getActiveVenues } from "../controllers/venueController";

const router = Router();

// List active venues (no auth required to read; safe)
router.get("/", getActiveVenues);

export default router;
