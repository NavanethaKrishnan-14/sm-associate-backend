import { Router } from "express";
import { listDocuments, downloadDocumentFile } from "../controllers/documentController";
const router=Router();
router.get("/file/:publicId",downloadDocumentFile);
router.get("/",listDocuments);
export default router;
