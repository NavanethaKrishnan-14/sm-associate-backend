import { Router } from "express";
import { createCustomer,getCustomer,listCustomers } from "../controllers/customerController";
const router=Router();
router.get("/",listCustomers);
router.post("/",createCustomer);
router.get("/:id",getCustomer);
export default router;