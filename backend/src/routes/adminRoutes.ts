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
import { httpError } from "../utils/httpError";

const router = Router();

router.use(ensureAuth, ensureRole(["admin"]));

router.get("/users", getUsers); 

// --- 2. ADD NEW ROUTES ---

// TODO(WP4.2): these three still talk to the model directly, unlike the rest of
// the codebase. Move them into adminController + adminService.

// PUT /api/admin/users/:id/set-approval
router.put("/users/:id/set-approval", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    if (typeof isApproved !== "boolean") {
      throw httpError(400, "Invalid 'isApproved' value.");
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      {
        $set: { isApproved },
        // Withdrawing approval is a privilege removal, so existing sessions
        // must end. Granting it is not — no reason to sign someone out at the
        // moment they gain access.
        ...(isApproved ? {} : { $inc: { sessionVersion: 1 } }),
      },
      { new: true, select: "-passwordHash" }
    );

    if (!updatedUser) throw httpError(404, "User not found.");
    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/suspend
router.put("/users/:id/suspend", async (req, res, next) => {
  try {
    const { id } = req.params;
    // Suspension has to take effect now, not at the user's next login — which
    // could be up to fourteen days away. Bumping sessionVersion in the same
    // write ends every session they currently hold.
    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { $set: { isSuspended: true }, $inc: { sessionVersion: 1 } },
      { new: true, select: "-passwordHash" }
    );
    if (!updatedUser) throw httpError(404, "User not found.");
    res.status(200).json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/unsuspend
router.put("/users/:id/unsuspend", async (req, res, next) => {
  try {
    const { id } = req.params;
    // Also bumps the version: lifting a suspension must not resurrect the
    // sessions that were open when it was applied.
    const updatedUser = await userModel.findByIdAndUpdate(
      id,
      { $set: { isSuspended: false }, $inc: { sessionVersion: 1 } },
      { new: true, select: "-passwordHash" }
    );
    if (!updatedUser) throw httpError(404, "User not found.");
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
