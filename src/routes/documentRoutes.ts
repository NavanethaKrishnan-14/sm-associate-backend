import { Router } from "express";
import { listDocuments } from "../controllers/documentController";
const router=Router();
router.get("/",listDocuments);
export default router;
