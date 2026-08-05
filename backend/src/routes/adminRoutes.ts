import { Router } from "express";
import { ensureAuth } from "../middleware/ensureAuth";
import { ensureRole } from "../middleware/ensureRole";

// Organizer approval controllers
import {
  listPendingOrganizers,
  approveOrganizer,
  rejectOrganizer,
} from "../controllers/adminController";

import { getUsers } from "../controllers/authController";

// Venue management controllers
import {
  createVenueController,
  updateVenueController,
  getActiveVenues,
  getVenueByIdController,
  deleteVenueController,
} from "../controllers/venueController";
import { listAllEvents } from "../controllers/eventController";
import { getStatsController } from "../controllers/adminStatsController";
import { listAllBookingsController } from "../controllers/adminBookingController";
import {
  setApprovalController,
  suspendUserController,
  unsuspendUserController,
} from "../controllers/adminUserController";

const router = Router();

router.use(ensureAuth, ensureRole(["admin"]));

router.get("/users", getUsers);

// User management
router.put("/users/:id/set-approval", setApprovalController);
router.put("/users/:id/suspend", suspendUserController);
router.put("/users/:id/unsuspend", unsuspendUserController);

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
router.get("/stats", getStatsController);
// Events
router.get("/events", listAllEvents);
router.get("/bookings", listAllBookingsController);

export default router;
