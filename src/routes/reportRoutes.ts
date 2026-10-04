import { Router } from "express";
import { dashboard,loanRevenue } from "../controllers/reportController";
import { requireAdmin } from "../middleware/auth";
const router=Router();
router.get("/dashboard",dashboard);
router.get("/loan-revenue",requireAdmin,loanRevenue);
export default router;