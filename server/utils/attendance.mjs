import moment from "moment";
import Attendance from "../db/models/Attendance.mjs";
import { DATE_FORMAT } from "../constants/date_constants.mjs";
import "moment-timezone";

export const updateAttendance = async (
  fromDate,
  toDate,
  employee,
  leaveType,
  extended,
) => {
  try {
    const dateArray = [];
    const currentDate = fromDate.clone();
    const lastDate = toDate.clone();

    while (currentDate <= lastDate) {
      dateArray.push(currentDate.toDate());
      if (
        moment(currentDate)
          .endOf("year")
          .startOf("day")
          .isSame(currentDate, "day")
      ) {
        currentDate.add(1, "year");
        currentDate.month(0);
        currentDate.date(1);
      } else if (
        moment(currentDate)
          .endOf("month")
          .startOf("day")
          .isSame(currentDate, "day")
      ) {
        currentDate.add(1, "month");
        currentDate.date(1);
      } else {
        currentDate.add(1, "day");
      }
    }
    const attendances = [];
    for (const date of dateArray) {
      const attendanceOnDate = await Attendance.findOne({
        date,
        employee: employee._id,
      });
      if (!attendanceOnDate) {
        const perDaySalary = employee.salary.base / moment(date).daysInMonth();
        const daySalary = leaveType === "Medical Leave" && !extended ? perDaySalary : 0;
        const deducted = leaveType === "Medical Leave" && !extended ? 0 : perDaySalary;
        employee.salary.finalAmount = employee.salary.finalAmount - deducted;
        employee.salary.deductions = employee.salary.deductions + deducted;
        attendances.push({
          employee: employee._id,
          date,
          status: leaveType,
          perDaySalary,
          daySalary,
          deducted,
          entryExitTime: [],
        });
      } else {
        const status = leaveType;
        const prevStatus = attendanceOnDate.status;
        const paidStatus = ["Present", "Medical Leave", "Holiday"];
        // recover the salary
        employee.salary.finalAmount =
          employee.salary.finalAmount + attendanceOnDate.deducted;
        employee.salary.lastUpdated = Date.now();
        employee.salary.deductions =
          employee.salary.deductions - attendanceOnDate.deducted;
        // update salary according to new status
        if (paidStatus.includes(status) && paidStatus.includes(prevStatus) && !extended) {
          attendanceOnDate.status = status;
        } else if (paidStatus.includes(status) && !extended) {
          attendanceOnDate.status = status;
          attendanceOnDate.daySalary = attendanceOnDate.perDaySalary;
          attendanceOnDate.deducted = 0;
          attendanceOnDate.entryExitTime =
            status === "Present" ? attendanceOnDate.entryExitTime : [];
        } else {
          employee.salary.finalAmount =
            employee.salary.finalAmount - attendanceOnDate.perDaySalary;
          employee.salary.deductions =
            employee.salary.deductions + attendanceOnDate.perDaySalary;

          attendanceOnDate.status = status;
          attendanceOnDate.daySalary = 0;
          attendanceOnDate.deducted = attendanceOnDate.perDaySalary;
          attendanceOnDate.entryExitTime = [];
        }
        await attendanceOnDate.save();
      }
    }
    await Attendance.insertMany(attendances);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};
