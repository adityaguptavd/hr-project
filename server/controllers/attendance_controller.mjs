import fetchCredentials from "../middleware/fetchCredentials.mjs";
import multer from "multer";
import csvToJson from "csvtojson";
import Employee from "../db/models/Employee.mjs";
import Admin from "../db/models/Admin.mjs";
import moment from "moment";
import { DATE_FORMAT } from "../constants/date_constants.mjs";
import { isValidObjectId } from "mongoose";
import LeaveApplication from "../db/models/LeaveApplication.mjs";
import Attendance from "../db/models/Attendance.mjs";
import { body } from "express-validator";
import validateErrors from "../middleware/validateErrors.mjs";

const upload = multer({ storage: multer.memoryStorage() });

const maxTime = (time1, time2) => {
  const hour1 = time1.getHours();
  const hour2 = time1.getHours();

  const mins1 = time1.getMinutes();
  const mins2 = time2.getMinutes();

  const seconds1 = time1.getSeconds();
  const seconds2 = time2.getSeconds();

  const date1 = new Date();
  date1.setHours(hour1);
  date1.setMinutes(mins1);
  date1.setSeconds(seconds1);

  const date2 = new Date();
  date2.setHours(hour2);
  date2.setMinutes(mins2);
  date2.setSeconds(seconds2);

  return date1 > date2 ? date1 : date2;
};

const minTime = (time1, time2) => {
  const hour1 = time1.getHours();
  const hour2 = time1.getHours();

  const mins1 = time1.getMinutes();
  const mins2 = time2.getMinutes();

  const seconds1 = time1.getSeconds();
  const seconds2 = time2.getSeconds();

  const date1 = new Date();
  date1.setHours(hour1);
  date1.setMinutes(mins1);
  date1.setSeconds(seconds1);

  const date2 = new Date();
  date2.setHours(hour2);
  date2.setMinutes(mins2);
  date2.setSeconds(seconds2);

  return date1 < date2 ? date1 : date2;
};

export const uploadAttendance = [
  fetchCredentials,
  upload.single("attendance"),
  async (req, res) => {
    try {
      const admin = await Admin.findById(req.credential.id);
      if (!admin) {
        return res.status(403).json({ error: "Access Denied" });
      }
      csvToJson({
        noheader: true,
        output: "json",
        headers: [
          "Employee ID",
          "First Name",
          "Department",
          "Date",
          "Times",
          "Time",
        ],
      })
        .fromString(req.file.buffer.toString())
        .then(async (jsonObj) => {
          // Skip the first row if it's incorrectly formatted due to missing headers in CSV
          const rows = jsonObj.slice(1);

          for (const row of rows) {
            try {
              // Find the employee in the database
              const date = moment(row["Date"], "YYYY-MM-DD").startOf("day").toDate();
              const employee = await Employee.findOne({
                employeeId: row["Employee ID"],
              })
                .populate("department")
                .exec();
              if (employee) {
                // check if attendance already exists for the employee
                const attendance = await Attendance.findOne({
                  employee: employee._id,
                  date,
                });
                if (!attendance) {
                  // Add the attendance record to the employee's attendance array
                  const officeTime =
                    employee.department.close - employee.department.open; // office  time in milliseconds
                  let status;
                  let daySalary;
                  let deducted;
                  let entryExitTime = [];
                  const oneDaySalary =
                    employee.salary.base / moment(row["Date"], "YYYY-MM-DD").startOf("day").daysInMonth();
                  if (
                    !row["Times"] ||
                    row["Times"] === 0 ||
                    row["Times"] === "" ||
                    row["Times"] === "0"
                  ) {
                    // check if he has applied for leave
                    const leave = await LeaveApplication.findOne({
                      employee: employee._id,
                      fromDate: { $lte: date },
                      toDate: { $gte: date },
                      status: "Approved",
                    });
                    if (leave) {
                      status = leave.leaveType;
                      // check whether the leave is paid or unpaid
                      if (leave.leaveType === "Medical Leave") {
                        daySalary = oneDaySalary;
                        deducted = 0;
                      } else {
                        employee.salary.deductions =
                          employee.salary.deductions + oneDaySalary;
                        employee.salary.finalAmount =
                          employee.salary.finalAmount - oneDaySalary;
                        daySalary = 0;
                        deducted = oneDaySalary;
                      }
                    } else {
                      status = "Absent";
                      employee.salary.deductions =
                        employee.salary.deductions + oneDaySalary;
                      employee.salary.finalAmount =
                        employee.salary.finalAmount - oneDaySalary;
                      daySalary = 0;
                      deducted = oneDaySalary;
                    }
                  } else {
                    const timeOfEntryOrExit = row["Time"].split(",");
                    let employeesPresentTime = 0; // in milliseconds
                    for (let i = 0; i < timeOfEntryOrExit.length; i = i + 2) {
                      // time when employee enters
                      const [entryHour, entryMin, entrySec] =
                        timeOfEntryOrExit[i].split(":");
                      const entryTime = new Date();
                      entryTime.setHours(+entryHour);
                      entryTime.setMinutes(+entryMin);
                      entryTime.setSeconds(+entrySec);

                      // time when employee exits
                      const [exitHour, exitMin, exitSec] =
                        timeOfEntryOrExit[i + 1].split(":");
                      const exitTime = new Date();
                      exitTime.setHours(+exitHour);
                      exitTime.setMinutes(+exitMin);
                      exitTime.setSeconds(+exitSec);

                      // total time when employee was in the office
                      employeesPresentTime +=
                        minTime(exitTime, employee.department.close) -
                        maxTime(entryTime, employee.department.open);
                      entryExitTime.push(entryTime);
                      entryExitTime.push(exitTime);
                    }
                    if (employeesPresentTime <= officeTime / 2) {
                      status = "Half Day";
                      employee.salary.deductions =
                        employee.salary.deductions + oneDaySalary / 2;
                      employee.salary.finalAmount =
                        employee.salary.finalAmount - oneDaySalary / 2;
                      daySalary = oneDaySalary / 2;
                      deducted = oneDaySalary / 2;
                    } else {
                      status = "Present";
                      daySalary = oneDaySalary;
                      deducted = 0;
                    }
                  }
                  employee.salary.lastUpdated = Date.now();

                  const attendance = new Attendance({
                    employee: employee._id,
                    date,
                    status,
                    daySalary,
                    deducted,
                    perDaySalary: oneDaySalary,
                    entryExitTime,
                  });
                  await attendance.save();
                  // Save the updated employee document
                  await employee.save();
                }
              }
            } catch (error) {
              console.error(error);
            }
          }
          return res.status(200).json({ message: "Attendance Uploaded" });
        });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
];

export const fetchAttendance = [
  fetchCredentials,
  async (req, res) => {
    try {
      const { id, year, month } = req.params;
      if (!id || !isValidObjectId(id)) {
        return res.status(422).json({ error: "Invalid Employee ID" });
      }
      const employee = await Employee.findById(id, "_id");
      if (!employee) {
        return res.status(403).json({ error: "No Employee Found" });
      }
      const admin = await Admin.findById(req.credential.id);
      if (!admin) {
        const pseudoAdmin = await Employee.findById(req.credential.id)
          .populate("department", "pseudoAdmin")
          .exec();
        if (
          !pseudoAdmin ||
          !pseudoAdmin.department ||
          !pseudoAdmin.department.pseudoAdmin
        ) {
          if (id !== req.credential.id) {
            return res.status(403).json({ error: "Access Denied" });
          }
        }
      }
      let attendance = [];
      let total = 0;
      if (year && month && !isNaN(month) && !isNaN(year)) {
        let paddedMonth = Number(month) + 1;
        if (paddedMonth < 10) {
          paddedMonth = `0${paddedMonth}`;
        }
        const startDate = moment(
          `01/${paddedMonth}/${year}`,
          DATE_FORMAT
        ).startOf("day").toDate();
        const endDate = moment(startDate).endOf("month").toDate();
        attendance = await Attendance.find(
          {
            employee: employee._id,
            date: {
              $gte: startDate, // Start of the specified month
              $lte: endDate, // End of the specified month
            },
          },
          "-employee"
        );
        total = await Attendance.countDocuments({
          employee: employee._id,
          date: {
            $gte: startDate, // Start of the specified month
            $lte: endDate, // End of the specified month
          },
        });
      }
      return res.status(200).json({ attendance, total });
    } catch (error) {
      console.error(error);
    }
  },
];

export const switchAttendanceStatus = [
  body("status")
    .exists()
    .isIn([
      "Present",
      "Absent",
      "Medical Leave",
      "Casual Leave",
      "Half Day",
      "Holiday",
      "Remove",
    ])
    .withMessage("Invalid Status"),
  validateErrors,
  fetchCredentials,
  async (req, res) => {
    try {
      const admin = await Admin.findById(req.credential.id);
      if (!admin) {
        return res.status(403).json({ error: "Access Denied" });
      }
      const { id } = req.params; // attendance id
      if (!id || !isValidObjectId(id)) {
        return res.status(422).json({ error: "Invalid Attendance ID" });
      }
      const attendance = await Attendance.findById(id);
      if (!attendance) {
        return res.status(404).json({ error: "Attendance record not found" });
      }
      const employee = await Employee.findById(attendance.employee);
      if (!employee) {
        return res.status(403).json({ error: "No Employee Found" });
      }
      const { status } = req.body;
      const prevStatus = attendance.status;
      const paidStatus = ["Present", "Medical Leave", "Holiday"];
      // recover the salary
      employee.salary.finalAmount =
        employee.salary.finalAmount + attendance.deducted;
      employee.salary.lastUpdated = Date.now();
      employee.salary.deductions =
        employee.salary.deductions - attendance.deducted;
      if (status === "Remove") {
        await Attendance.deleteOne({ _id: id });
        await employee.save();
      return res.status(200).json({ message: "Attendance Removed!" });
      }
      // update salary according to new status
      else if (paidStatus.includes(status) && paidStatus.includes(prevStatus)) {
        attendance.status = status;
      } else if (paidStatus.includes(status)) {
        attendance.status = status;
        attendance.daySalary = attendance.perDaySalary;
        attendance.deducted = 0;
        attendance.entryExitTime =
          status === "Present" ? attendance.entryExitTime : [];
      } else if (status === "Half Day") {
        employee.salary.finalAmount =
          employee.salary.finalAmount - attendance.perDaySalary / 2;
        employee.salary.deductions =
          employee.salary.deductions + attendance.perDaySalary / 2;
        attendance.status = status;
        attendance.daySalary = attendance.perDaySalary / 2;
        attendance.deducted = attendance.perDaySalary / 2;
      } else {
        employee.salary.finalAmount =
          employee.salary.finalAmount - attendance.perDaySalary;
        employee.salary.deductions =
          employee.salary.deductions + attendance.perDaySalary;

        attendance.status = status;
        attendance.daySalary = 0;
        attendance.deducted = attendance.perDaySalary;
        attendance.entryExitTime = [];
      }
      await employee.save();
      await attendance.save();
      return res.status(200).json({ message: "Attendance status updated!" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
];

export const addAttendance = [
  body("status")
    .exists()
    .isIn([
      "Present",
      "Absent",
      "Medical Leave",
      "Casual Leave",
      "Half Day",
      "Holiday",
    ])
    .withMessage("Invalid Status"),
  body("date").custom((date) => {
    if (!date) {
      throw new Error("date is required");
    } else {
      const isValidDate = moment(date).isValid();
      if (isValidDate) {
        return true;
      }
      throw new Error("Invalid Date");
    }
  }),
  validateErrors,
  fetchCredentials,
  async (req, res) => {
    try {
      const admin = await Admin.findById(req.credential.id);
      if (!admin) {
        return res.status(403).json({ error: "Access Denied" });
      }
      const { status } = req.body;
      console.log(req.body.date);
      let date = moment(req.body.date).startOf("day");
      if (
        moment(date)
          .endOf("year")
          .startOf("day")
          .isSame(date, "day")
      ) {
        date.add(1, "year");
        date.month(0);
        date.date(1);
      } else if (
        moment(date)
          .endOf("month")
          .startOf("day")
          .isSame(date, "day")
      ) {
        date.add(1, "month");
        date.date(1);
      } else {
        date.add(1, "day");
      }
      date = date.toDate();
      console.log(date);
      const { id } = req.params; // employee id
      if (!id || !isValidObjectId(id)) {
        return res.status(422).json({ error: "Invalid Employee ID" });
      }
      const employee = await Employee.findById(id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found!" });
      }
      let attendance = await Attendance.findOne({
        employee: employee._id,
        date,
      });
      if (attendance) {
        return res
          .status(409)
          .json({ error: "Attendance is already uploaded" });
      }
      const daysInMonth = moment(req.body.date).startOf("day").daysInMonth();
      attendance = new Attendance({
        employee: employee._id,
        status,
        date,
        entryExitTime: [],
        daySalary: 0,
        perDaySalary: employee.salary.base / daysInMonth,
        deducted: 0,
      });
      const paidStatus = ["Present", "Medical Leave", "Holiday"];
      if (paidStatus.includes(status)) {
        attendance.daySalary = attendance.perDaySalary;
        attendance.deducted = 0;
      } else if (status === "Half Day") {
        employee.salary.finalAmount =
          employee.salary.finalAmount - attendance.perDaySalary / 2;
        employee.salary.deductions =
          employee.salary.deductions + attendance.perDaySalary / 2;
        attendance.daySalary = attendance.perDaySalary / 2;
        attendance.deducted = attendance.perDaySalary / 2;
      } else {
        employee.salary.finalAmount =
          employee.salary.finalAmount - attendance.perDaySalary;
        employee.salary.deductions =
          employee.salary.deductions + attendance.perDaySalary;
        attendance.daySalary = 0;
        attendance.deducted = attendance.perDaySalary;
      }
      employee.salary.lastUpdated = Date.now();
      await employee.save();
      await attendance.save();
      return res.status(201).json({ message: "Attendance Added" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  },
];
