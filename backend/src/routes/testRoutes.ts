import { Router } from "express";
import { ensureAuth } from "../middleware/ensureAuth";

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
    },
  });
});

export default router;
