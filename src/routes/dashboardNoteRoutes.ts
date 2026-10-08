import {Router} from "express";
import {getDashboardNotes,createDashboardNote,updateDashboardNote,deleteDashboardNote} from "../controllers/dashboardNoteController";
import {requireStaffOrAdmin} from "../middleware/auth";

const router=Router();

router.get("/",getDashboardNotes);
router.post("/",requireStaffOrAdmin,createDashboardNote);
router.patch("/:id",requireStaffOrAdmin,updateDashboardNote);
router.delete("/:id",requireStaffOrAdmin,deleteDashboardNote);

export default router;
