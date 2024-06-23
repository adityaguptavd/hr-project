import { Router } from "express";
import {
  fetchAllEmployees,
  fetchEmployeeById,
  createEmployee,
  updateEmployee,
  removeEmployee,
} from "../controllers/employee_controller.mjs";

const router = Router();

router.post("/createEmployee", createEmployee);
router.get("/fetchAllEmployees", fetchAllEmployees);
router.get("/fetchEmployeeById/:id/:month/:year", fetchEmployeeById);
router.put("/updateEmployee/:id", updateEmployee);
router.delete("/removeEmployee/:id", removeEmployee);

export default router;
