const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
});

// One entry per meaningful change on a task (status change, checklist tick,
// comment, etc.). Rendered as a timeline on the task details page.
const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["created", "updated", "status", "checklist", "comment"],
      required: true,
    },
    message: { type: String, required: true, maxlength: 1000 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    dueDate: { type: Date, required: true },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    attachments: [{ type: String }],
    todoChecklist: [todoSchema],
    progress: { type: Number, default: 0, min: 0, max: 100 },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    activity: [activitySchema],
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model("Task", taskSchema);
