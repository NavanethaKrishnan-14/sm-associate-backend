import { Router } from "express";
import { dashboard,loanRevenue,operationalReport } from "../controllers/reportController";
import { requireAdmin } from "../middleware/auth";
const router=Router();
router.get("/dashboard",dashboard);
router.get("/loan-revenue",requireAdmin,loanRevenue);
router.get("/operational",requireAdmin,operationalReport);
export default router;