import { Router } from "express";
import {
  createVenueController,
  updateVenueController,
} from "../controllers/venueController";
const router = Router();

// PUT /api/admin/venues/:id
router.post("/create", createVenueController);
router.put("/:id/update", updateVenueController);

export default router;
