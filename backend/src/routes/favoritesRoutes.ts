import { Router } from "express";
import { ensureAuth } from "../middleware/ensureAuth";
import { ensureRole } from "../middleware/ensureRole";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
  toggleFavorite,
} from "../controllers/favoritesController";

import { validateParams } from "../middleware/validate";
import { eventIdParamSchema } from "../validation/schemas";

const router = Router();

// attendees are the ones favoriting events
router.use(ensureAuth, ensureRole(["attendee"]));

router.get("/", listFavorites);
router.post("/:eventId", validateParams(eventIdParamSchema), addFavorite);
router.delete(
  "/:eventId",
  validateParams(eventIdParamSchema),
  removeFavorite
);
// optional convenience:
router.post(
  "/:eventId/toggle",
  validateParams(eventIdParamSchema),
  toggleFavorite
);

export default router;
