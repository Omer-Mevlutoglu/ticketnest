import { Router } from "express";
import { ensureApproved } from "../middleware/ensureApproved";
import { ensureRole } from "../middleware/ensureRole";
import {
  createEventController,
  deleteEventController,
  getMyEventById,
  getPublicEventById,
  listMyEvents,
  listPublicEvents,
  updateEventController,
} from "../controllers/eventController";
import { ensureAuth } from "../middleware/ensureAuth";
import { getSeatMapController, upsertSeatMapController } from "../controllers/seatMapController";

const router = Router();

// Public listing
router.get("/", listPublicEvents);
// Organizer’s own
router.get(
  "/mine",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  listMyEvents
);
router.get(
  "/mine/:id",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  getMyEventById
);
// Public detail
router.get("/:id", getPublicEventById);
// Organizer create
router.post(
  "/",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  createEventController
);

router.put(
  "/:id",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  updateEventController
);

router.delete(
  "/:id",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  deleteEventController
);
router.get(
  "/:id/seatmap",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  getSeatMapController
);

router.put(
  "/:id/seatmap",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  upsertSeatMapController
);

export default router;
