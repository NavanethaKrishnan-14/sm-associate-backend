import { Router } from "express";
import { listFinanceServices,seedFinanceServices } from "../controllers/financeServiceController";
import { requireAdmin } from "../middleware/auth";

const router=Router();
router.get("/",listFinanceServices);
router.post("/seed",requireAdmin,seedFinanceServices);
export default router;
