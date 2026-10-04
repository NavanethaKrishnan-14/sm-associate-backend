import { Router } from "express";
import { createFinanceEnquiry,listFinanceEnquiries,updateFinanceEnquiry } from "../controllers/financeEnquiryController";
const router=Router();
router.get("/",listFinanceEnquiries);
router.post("/",createFinanceEnquiry);
router.patch("/:id",updateFinanceEnquiry);
export default router;
