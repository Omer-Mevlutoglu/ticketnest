// src/routes/adminRoutes.ts
import { Router } from "express";
import { ensureAuth } from "../middleware/ensureAuth";
import { ensureRole } from "../middleware/ensureRole";

// Organizer approval controllers
import {
  listPendingOrganizers,
  approveOrganizer,
  rejectOrganizer,
} from "../controllers/adminController";

// User management controller
import { getUsers } from "../controllers/authController";

// Venue management controllers
import {
  createVenueController,
  updateVenueController,
  getActiveVenues,
  getVenueByIdController,
  deleteVenueController,
} from "../controllers/venueController";

const router = Router();

// Apply to _all_ /api/admin/* routes:
router.use(ensureAuth, ensureRole(["admin"]));

// --- User Management ---
router.get("/users", getUsers);

// --- Organizer Approval ---
router.get("/organizers/pending", listPendingOrganizers);
router.put("/organizers/:organizerId/approve", approveOrganizer);
router.put("/organizers/:organizerId/reject", rejectOrganizer);

// --- Venue Management ---
router.post("/venues", createVenueController);
router.put("/venues/:id", updateVenueController);
router.get("/venues", getActiveVenues);
router.get("/venues/:id", getVenueByIdController);
router.delete("/venues/:id", deleteVenueController);

export default router;
