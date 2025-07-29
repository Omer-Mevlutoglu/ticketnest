import { Router } from "express";
import { register, login, logout } from "../controllers/authController";
import { validateBody } from "../middleware/validateBody";

const router = Router();

router.post(
  "/register",
  validateBody([
    { field: "username", type: "string" },
    { field: "email", type: "email" },
    { field: "password", type: "minLength", length: 6 },
    { field: "role", type: "enum", options: ["attendee", "organizer"] },
  ]),
  register
);

router.post(
  "/login",
  validateBody([
    { field: "email", type: "email" },
    { field: "password", type: "string" },
  ]),
  login
);

// optional
router.post("/logout", logout);

export default router;
