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
import {
  generateSeatMapFromSpecController,
  getMySeatMapController,
  getSeatMapController,
  upsertSeatMapController,
} from "../controllers/seatMapController";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate";
import {
  createEventSchema,
  generateSeatMapSchema,
  idParamSchema,
  paginationSchema,
  updateEventSchema,
  upsertSeatMapSchema,
} from "../validation/schemas";

const router = Router();

// Public listing
router.get("/", validateQuery(paginationSchema), listPublicEvents);
// Organizer’s own
router.get(
  "/mine",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  validateQuery(paginationSchema),
  listMyEvents
);
router.get(
  "/mine/:id/seatmap",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  validateParams(idParamSchema),
  getMySeatMapController
);
router.get(
  "/mine/:id",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  getMyEventById
);
// Public detail
router.get("/:id", validateParams(idParamSchema), getPublicEventById);
// Organizer create
router.post(
  "/",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  validateBody(createEventSchema),
  createEventController
);

router.put(
  "/:id",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  validateParams(idParamSchema),
  validateBody(updateEventSchema),
  updateEventController
);

router.delete(
  "/:id",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  validateParams(idParamSchema),
  deleteEventController
);
router.get(
  "/:id/seatmap",
  validateParams(idParamSchema),
  getSeatMapController
);
router.put(
  "/:id/seatmap",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  validateParams(idParamSchema),
  validateBody(upsertSeatMapSchema),
  upsertSeatMapController
);

router.post(
  "/:id/seatmap/generate",
  ensureAuth,
  ensureRole(["organizer"]),
  ensureApproved,
  validateParams(idParamSchema),
  validateBody(generateSeatMapSchema),
  generateSeatMapFromSpecController
);
export default router;
