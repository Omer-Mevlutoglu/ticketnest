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

import { validateQuery } from "../middleware/validate";
import {
  adminBookingQuerySchema,
  paginationSchema,
} from "../validation/schemas";
import {
  requireDemoWriteAccess,
  sanitizeDemoAdminResponses,
} from "../middleware/demoPolicy";
import { requirePasswordRotationComplete } from "../middleware/requirePasswordRotation";

const router = Router();

router.use(ensureAuth, ensureRole(["admin"]));
router.use(requirePasswordRotationComplete);
router.use(sanitizeDemoAdminResponses);

router.get("/users", validateQuery(paginationSchema), getUsers);

// User management
router.put(
  "/users/:id/set-approval",
  requireDemoWriteAccess,
  setApprovalController
);
router.put("/users/:id/suspend", requireDemoWriteAccess, suspendUserController);
router.put(
  "/users/:id/unsuspend",
  requireDemoWriteAccess,
  unsuspendUserController
);

// --- Organizer Approval ---
router.get("/organizers/pending", listPendingOrganizers);
router.put(
  "/organizers/:organizerId/approve",
  requireDemoWriteAccess,
  approveOrganizer
);
router.put(
  "/organizers/:organizerId/reject",
  requireDemoWriteAccess,
  rejectOrganizer
);

// --- Venue Management ---
router.post("/venues", requireDemoWriteAccess, createVenueController);
router.put("/venues/:id", requireDemoWriteAccess, updateVenueController);
router.get("/venues", getActiveVenues);
router.get("/venues/:id", getVenueByIdController);
router.delete("/venues/:id", requireDemoWriteAccess, deleteVenueController);
router.get("/stats", getStatsController);
// Events
router.get("/events", validateQuery(paginationSchema), listAllEvents);
router.get(
  "/bookings",
  validateQuery(adminBookingQuerySchema),
  listAllBookingsController
);

export default router;
