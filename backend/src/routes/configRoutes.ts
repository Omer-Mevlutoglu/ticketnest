import { Router } from "express";
import { isEmailEnabled, isMockPaymentsEnabled } from "../configs/features";

const router = Router();

/**
 * Public runtime configuration for the browser client.
 *
 * Exists so the UI never offers an action the server will reject: when
 * simulated payments are switched off, checkout can say so instead of failing
 * on submit. Only non-sensitive feature flags belong here.
 */
router.get("/", (_req, res) => {
  res.json({
    mockPaymentsEnabled: isMockPaymentsEnabled(),
    // Drives whether the UI offers password reset and whether signup tells the
    // user to check their inbox.
    emailEnabled: isEmailEnabled(),
  });
});

export default router;
