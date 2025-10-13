import { Router } from "express";
import { ensureAuth } from "../middleware/ensureAuth";
import { ensureRole } from "../middleware/ensureRole";
import {
  addFavorite,
  listFavorites,
  removeFavorite,
  toggleFavorite,
} from "../controllers/favoritesController";

const router = Router();

// attendees are the ones favoriting events
router.use(ensureAuth, ensureRole(["attendee"]));

router.get("/", listFavorites);
router.post("/:eventId", addFavorite);
router.delete("/:eventId", removeFavorite);
// optional convenience:
router.post("/:eventId/toggle", toggleFavorite);

export default router;
