import { Router } from "express";
import { dashboard,loanRevenue } from "../controllers/reportController";
const router=Router();
router.get("/dashboard",dashboard);
router.get("/loan-revenue",loanRevenue);
export default router;