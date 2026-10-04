import { Router } from "express";
import { createLoan,listLoans,updateLoan } from "../controllers/loanController";
const router=Router();
router.get("/",listLoans);
router.post("/",createLoan);
router.patch("/:id",updateLoan);
export default router;