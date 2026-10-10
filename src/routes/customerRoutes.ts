import { Router } from "express";
import { createCustomer,createCustomerDocumentUpload,completeCustomerDocumentUpload,uploadCustomerDocument,deleteCustomer,getCustomer,getCustomerHistory,listCustomers,updateCustomer,updateCustomerDocuments } from "../controllers/customerController";
import { requireStaffOrAdmin } from "../middleware/auth";
import { customerDocumentUpload } from "../middleware/customerDocumentUpload";
const router=Router();
router.get("/",listCustomers);
router.post("/",createCustomer);
router.get("/:id/history",getCustomerHistory);
router.post("/:id/documents/:documentKey/signature",createCustomerDocumentUpload);
router.post("/:id/documents/:documentKey/complete",completeCustomerDocumentUpload);
router.post("/:id/documents/:documentKey",customerDocumentUpload.single("file"),uploadCustomerDocument);
router.patch("/:id/documents",updateCustomerDocuments);
router.get("/:id",getCustomer);
router.patch("/:id",updateCustomer);
router.put("/:id",updateCustomer);
// Staff and admins may delete customers. Database ON DELETE SET NULL rules preserve linked business history.
router.delete("/:id",requireStaffOrAdmin,deleteCustomer);
export default router;