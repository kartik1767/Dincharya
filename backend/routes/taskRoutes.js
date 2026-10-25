const express = require("express");
const mongoose = require("mongoose");
const { protect, adminOnly } = require("../middlewares/authMiddleware");
const {
  getDashboardData,
  getUserDashboardData,
  getTaskById,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskChecklist,
  addTaskComment,
} = require("../controllers/taskController");

const router = express.Router();

// Reject malformed ids up front instead of letting Mongoose throw a CastError
router.param("id", (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return res.status(404).json({ message: "Task not found" });
  }
  next();
});

// Task Management Routes
router.get("/dashboard-data", protect, adminOnly, getDashboardData); // Admin: their own tasks
router.get("/user-dashboard-data", protect, getUserDashboardData);
router.get("/", protect, getTasks); // Admin: tasks they created, Member: assigned tasks
router.get("/:id", protect, getTaskById); // Owner admin or assignee
router.post("/", protect, adminOnly, createTask); // Create a task (Admin only)
router.put("/:id", protect, adminOnly, updateTask); // Update task details (owner admin)
router.delete("/:id", protect, adminOnly, deleteTask); // Delete a task (owner admin)
router.put("/:id/status", protect, updateTaskStatus); // Start / complete / reopen
router.put("/:id/todo", protect, updateTaskChecklist); // Tick checklist items
router.post("/:id/comments", protect, addTaskComment); // Progress notes / comments

module.exports = router;
