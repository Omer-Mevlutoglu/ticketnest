import { Router } from "express";
import { ensureApproved } from "../middleware/ensureApproved";
import { ensureRole } from "../middleware/ensureRole";
import {
  createEventController,
  getMyEventById,
  getPublicEventById,
  listMyEvents,
  listPublicEvents,
} from "../controllers/eventController";
import { ensureAuth } from "../middleware/ensureAuth";

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

export default router;
