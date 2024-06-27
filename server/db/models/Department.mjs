import mongoose from "mongoose";

// Department Schema
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  open: Date,
  close: Date,
  pseudoAdmin: Boolean,
  workingDays: {
    type: Number,
    enum: [300, 365],
    default: 365,
  }
});

const Department = mongoose.model("department", departmentSchema);
export default Department;
