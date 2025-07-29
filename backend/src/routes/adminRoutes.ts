// src/routes/adminRoutes.ts
import { Router } from "express";
import {
  listPendingOrganizers,
  approveOrganizer,
  rejectOrganizer,
} from "../controllers/adminController";
import { ensureAuth } from "../middleware/ensureAuth";
import { ensureRole } from "../middleware/ensureRole";

const router = Router();

// All admin routes under /organizers
router.use(ensureAuth, ensureRole(["admin"]));

// GET  /api/admin/organizers/pending
router.get("/organizers/pending", listPendingOrganizers);

// PUT  /api/admin/organizers/:organizerId/approve
router.put("/organizers/:organizerId/approve", approveOrganizer);

// PUT  /api/admin/organizers/:organizerId/reject
router.put("/organizers/:organizerId/reject", rejectOrganizer);

export default router;
