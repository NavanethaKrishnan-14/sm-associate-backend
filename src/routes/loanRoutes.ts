import { Router } from "express";
import { createLoan,listLoans } from "../controllers/loanController";
const router=Router();
router.get("/",listLoans); router.post("/",createLoan);
export default router;