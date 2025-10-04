import { Router } from "express";
import { ensureAuth } from "../middleware/ensureAuth";
import { ensureRole } from "../middleware/ensureRole";
import {
  cancelBookingController,
  createBookingController,
  listMyBookingsController,
  markFailedController,
  markPaidController,
} from "../controllers/bookingController";

const router = Router();

router.use(ensureAuth, ensureRole(["attendee"]));

router.post("/", createBookingController); // { eventId, seats:[{x,y}] }
router.get("/", listMyBookingsController);
router.delete("/:id", cancelBookingController);

// Manual testing endpoints (remove in prod)
router.post("/:id/pay-test", markPaidController);
router.post("/:id/fail-test", markFailedController);

export default router;
