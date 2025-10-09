import { Router } from "express";
import { ensureAuth } from "../middleware/ensureAuth";
import { ensureRole } from "../middleware/ensureRole";
import { ensureApproved } from "../middleware/ensureApproved";
import { organizerStatsController } from "../controllers/organizerController";

const router = Router();

router.use(ensureAuth, ensureRole(["organizer"]), ensureApproved);

router.get("/stats", organizerStatsController);

export default router;
