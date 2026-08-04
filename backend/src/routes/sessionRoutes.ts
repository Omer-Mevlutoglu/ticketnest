import { Router } from "express";
import { ensureAuth } from "../middleware/ensureAuth";

/**
 * Session hydration for the browser client.
 *
 * Despite living in `testRoutes.ts` and being mounted at `/api/testAuth`, this
 * has always been a production endpoint — the frontend calls it on every load
 * to find out who is signed in. It is now `/api/auth/me`, with the old path
 * kept as a deprecated alias because the two apps deploy separately.
 *
 * TODO: drop the `/api/testAuth` mount in `app.ts` once the deployed frontend
 * is known to be on `/api/auth/me`.
 */
const router = Router();

router.get("/me", ensureAuth, (req, res) => {
  const user = req.user as any;

  res.json({
    user: {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      username: user.username,
      mustChangePassword: user.mustChangePassword === true,
    },
  });
});

export default router;
