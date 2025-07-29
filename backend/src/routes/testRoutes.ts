// src/routes/testRoutes.ts
import { Router } from "express";
import { ensureAuth } from "../middleware/ensureAuth";

const router = Router();

/**
 * GET /api/testAuth/protected
 * A protected endpoint that returns the current user.
 * For testing only—delete when you’re done!
 */
router.get("/protected", ensureAuth, (req, res) => {
  // req.user was populated by Passport
  res.json({
    message: "Access granted 👍",
    user: req.user,
  });
});

export default router;
