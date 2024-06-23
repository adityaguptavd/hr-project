import { Router } from "express";
import { addAttendance } from "../controllers/attendance_controller.mjs";
import { fetchAttendance } from "../controllers/attendance_controller.mjs";
import { uploadAttendance, switchAttendanceStatus } from "../controllers/attendance_controller.mjs";

const router = Router();

router.post("/uploadAttendance", uploadAttendance);
router.get("/fetchAttendance/:id/:month/:year", fetchAttendance);
router.post("/addAttendance/:id", addAttendance);
router.patch("/switchAttendanceStatus/:id", switchAttendanceStatus);

export default router;