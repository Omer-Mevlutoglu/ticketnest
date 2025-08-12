// src/routes/cartRoutes.ts
import { Router } from "express";
import { ensureAuth } from "../middleware/ensureAuth";
import { ensureRole } from "../middleware/ensureRole";
import { addItemToCartController } from "../controllers/cartControllers";

const router = Router();

// POST /api/cart
router.post("/", ensureAuth, ensureRole(["attendee"]), addItemToCartController);

export default router;
