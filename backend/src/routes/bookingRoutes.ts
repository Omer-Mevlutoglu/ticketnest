import { Router } from "express";
import { ensureAuth } from "../middleware/ensureAuth";
import { ensureRole } from "../middleware/ensureRole";
import { requireMockPayments } from "../middleware/requireMockPayments";
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

// Simulated payment. Available only while ENABLE_MOCK_PAYMENTS is on; returns
// 404 otherwise. Replaced by the provider's webhook when Phase 6 Option A lands.
router.post("/:id/mock-pay", requireMockPayments, markPaidController);
router.post("/:id/mock-fail", requireMockPayments, markFailedController);

// DEPRECATED aliases. The frontend and backend deploy separately, so the old
// paths stay until a release where both sides are known to be on /mock-*.
// Remove once the deployed frontend no longer calls them.
router.post("/:id/pay-test", requireMockPayments, markPaidController);
router.post("/:id/fail-test", requireMockPayments, markFailedController);

export default router;
