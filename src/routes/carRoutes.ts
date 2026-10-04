import { Router } from "express";
import { addCarExpense,createCar,getCarFinancials,listCars,sellCar } from "../controllers/carController";
const router=Router();
router.get("/",listCars); router.post("/",createCar); router.get("/:id/financials",getCarFinancials); router.post("/:id/expenses",addCarExpense); router.post("/:id/sell",sellCar);
export default router;