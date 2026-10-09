import { Router } from "express";
import { createFinanceEnquiry,deleteFinanceEnquiry,listFinanceEnquiries,updateFinanceEnquiry } from "../controllers/financeEnquiryController";
const router=Router();
router.get("/",listFinanceEnquiries);
router.post("/",createFinanceEnquiry);
router.patch("/:id",updateFinanceEnquiry);
router.put("/:id",updateFinanceEnquiry);
router.delete("/:id",deleteFinanceEnquiry);
export default router;
