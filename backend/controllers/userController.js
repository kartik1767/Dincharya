const Task = require("../models/Task");
const User = require("../models/User");
const { sendError } = require("../utils/errors");

// @desc    Get all members, with counts of the tasks *this admin* gave them
// @route   GET /api/users/
// @access  Private (Admin)
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "member" }).select("-password").lean();
    const now = new Date();

    const usersWithTaskCounts = await Promise.all(
      users.map(async (user) => {
        const scope = { assignedTo: user._id, createdBy: req.user._id };
        const [pendingTasks, inProgressTasks, completedTasks, overdueTasks] = await Promise.all([
          Task.countDocuments({ ...scope, status: "Pending" }),
          Task.countDocuments({ ...scope, status: "In Progress" }),
          Task.countDocuments({ ...scope, status: "Completed" }),
          Task.countDocuments({ ...scope, status: { $ne: "Completed" }, dueDate: { $lt: now } }),
        ]);

        return { ...user, pendingTasks, inProgressTasks, completedTasks, overdueTasks };
      })
    );

    res.json(usersWithTaskCounts);
  } catch (error) {
    sendError(res, error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin, or the user themselves)
const getUserById = async (req, res) => {
  try {
    const isSelf = req.user._id.toString() === req.params.id;
    if (!isSelf && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = { getUsers, getUserById };
