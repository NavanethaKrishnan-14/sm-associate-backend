import { Router } from "express";
import { createUser, login, me } from "../controllers/authController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.post("/login", login);
router.get("/me", requireAuth, me);
router.post("/users", requireAuth, requireRole("ADMIN"), createUser);

export default router;
