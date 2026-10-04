import { Router } from "express";
import { dashboard } from "../controllers/reportController";
const router=Router();
router.get("/dashboard",dashboard);
export default router;