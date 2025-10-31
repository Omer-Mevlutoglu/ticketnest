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
import { listAllEvents } from "../controllers/eventController";
import { getStatsController } from "../controllers/adminStatsController";
import { listAllBookingsController } from "../controllers/adminBookingController";

// --- 1. IMPORT USER MODEL ---
import userModel from "../models/userModel";

const router = Router();

router.use(ensureAuth, ensureRole(["admin"]));

router.get("/users", getUsers); 

// --- 2. ADD NEW ROUTES ---

// PUT /api/admin/users/:id/set-approval
router.put("/users/:id/set-approval", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body; 

    if (typeof isApproved !== "boolean") {
      return res.status(400).json({ message: "Invalid 'isApproved' value." });
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { $set: { isApproved } },
      { new: true, select: "-passwordHash" } 
    );

    if (!updatedUser)
      return res.status(404).json({ message: "User not found." });
    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/suspend
router.put("/users/:id/suspend", async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { $set: { isSuspended: true } },
      { new: true, select: "-passwordHash" }
    );
    if (!updatedUser)
      return res.status(404).json({ message: "User not found." });
    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/unsuspend
router.put("/users/:id/unsuspend", async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { $set: { isSuspended: false } },
      { new: true, select: "-passwordHash" }
    );
    if (!updatedUser)
      return res.status(404).json({ message: "User not found." });
    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// --- 3. (EXISTING ROUTES) ---

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
