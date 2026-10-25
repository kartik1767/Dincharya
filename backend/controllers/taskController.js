const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const { sendError } = require("../utils/errors");
const { canViewTask, isTaskOwner, taskScope } = require("../utils/taskAccess");
const {
  STATUSES,
  computeProgress,
  applyStatus,
  syncProgressFromChecklist,
  addActivity,
} = require("../utils/taskProgress");

const ASSIGNEE_FIELDS = "name email profileImageUrl";

// Make sure every id in assignedTo is a real member account.
const validateAssignees = async (assignedTo) => {
  if (!Array.isArray(assignedTo)) {
    return "assignedTo must be an array of user IDs";
  }
  const ids = [...new Set(assignedTo.map(String))];
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    return "assignedTo contains an invalid user ID";
  }
  const found = await User.countDocuments({ _id: { $in: ids }, role: "member" });
  if (found !== ids.length) {
    return "Tasks can only be assigned to existing team members";
  }
  return null;
};

// Records a status change in the activity log if one happened.
const logStatusChange = (task, previousStatus, user, reason) => {
  if (task.status === previousStatus) return;
  const suffix = reason ? ` (${reason})` : "";
  addActivity(
    task,
    "status",
    `changed status from ${previousStatus} to ${task.status}${suffix}`,
    user
  );
};

const populateTask = (id) =>
  Task.findById(id)
    .populate("assignedTo", ASSIGNEE_FIELDS)
    .populate("createdBy", "name email profileImageUrl")
    .populate("activity.user", "name profileImageUrl role");

// Loads the task and enforces that the current user may see it.
// Responds with 404 for tasks the user can't see so other admins'
// task ids aren't confirmed to exist.
const loadVisibleTask = async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task || !canViewTask(task, req.user)) {
    res.status(404).json({ message: "Task not found" });
    return null;
  }
  return task;
};

// @desc    Get tasks (Admin: tasks they created, Member: tasks assigned to them)
// @route   GET /api/tasks/
// @access  Private
const getTasks = async (req, res) => {
  try {
    const { status } = req.query;
    const scope = taskScope(req.user);
    const filter = { ...scope };
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .select("-activity")
      .sort({ createdAt: -1 })
      .populate("assignedTo", ASSIGNEE_FIELDS)
      .lean();

    const tasksWithCounts = tasks.map((task) => ({
      ...task,
      completedTodoCount: task.todoChecklist.filter((item) => item.completed).length,
    }));

    const [all, pendingTasks, inProgressTasks, completedTasks] = await Promise.all([
      Task.countDocuments(scope),
      Task.countDocuments({ ...scope, status: "Pending" }),
      Task.countDocuments({ ...scope, status: "In Progress" }),
      Task.countDocuments({ ...scope, status: "Completed" }),
    ]);

    res.json({
      tasks: tasksWithCounts,
      statusSummary: { all, pendingTasks, inProgressTasks, completedTasks },
    });
  } catch (error) {
    sendError(res, error);
  }
};

// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private (task owner or assignee)
const getTaskById = async (req, res) => {
  try {
    const task = await loadVisibleTask(req, res);
    if (!task) return;

    const populated = await populateTask(task._id);
    res.json(populated);
  } catch (error) {
    sendError(res, error);
  }
};

// @desc    Create a new task
// @route   POST /api/tasks/
// @access  Private (Admin)
const createTask = async (req, res) => {
  try {
    const { title, description, priority, dueDate, assignedTo, attachments, todoChecklist } =
      req.body;

    const assigneeError = await validateAssignees(assignedTo);
    if (assigneeError) return res.status(400).json({ message: assigneeError });

    const task = new Task({
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      createdBy: req.user._id,
      todoChecklist,
      attachments,
    });
    task.progress = computeProgress(task.todoChecklist);
    addActivity(task, "created", "created this task", req.user);
    await task.save();

    res.status(201).json({ message: "Task created successfully", task });
  } catch (error) {
    sendError(res, error);
  }
};

// @desc    Update task details
// @route   PUT /api/tasks/:id
// @access  Private (Admin who created the task)
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || !isTaskOwner(task, req.user)) {
      return res.status(404).json({ message: "Task not found" });
    }

    const { title, description, priority, dueDate, todoChecklist, attachments, assignedTo } =
      req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (attachments !== undefined) task.attachments = attachments;

    if (assignedTo !== undefined) {
      const assigneeError = await validateAssignees(assignedTo);
      if (assigneeError) return res.status(400).json({ message: assigneeError });
      task.assignedTo = assignedTo;
    }

    const previousStatus = task.status;
    if (todoChecklist !== undefined) {
      task.todoChecklist = todoChecklist;
      // Adding / removing items changes the completion percentage
      syncProgressFromChecklist(task);
    }

    addActivity(task, "updated", "updated the task details", req.user);
    logStatusChange(task, previousStatus, req.user, "checklist changed");

    const updatedTask = await task.save();
    res.json({ message: "Task updated successfully", updatedTask });
  } catch (error) {
    sendError(res, error);
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private (Admin who created the task)
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || !isTaskOwner(task, req.user)) {
      return res.status(404).json({ message: "Task not found" });
    }

    await task.deleteOne();
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    sendError(res, error);
  }
};

// @desc    Update task status (Start working / Complete / Reopen ...)
// @route   PUT /api/tasks/:id/status
// @access  Private (task owner or assignee)
const updateTaskStatus = async (req, res) => {
  try {
    const task = await loadVisibleTask(req, res);
    if (!task) return;

    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ message: `Status must be one of: ${STATUSES.join(", ")}` });
    }

    if (status === task.status) {
      return res.status(400).json({ message: `Task is already ${status}` });
    }

    if (status === "Pending" && task.todoChecklist.some((item) => item.completed)) {
      return res.status(400).json({
        message: "Uncheck the completed checklist items before moving the task back to Pending",
      });
    }

    const previousStatus = task.status;
    applyStatus(task, status);

    if (status === "Completed") {
      task.todoChecklist.forEach((item) => (item.completed = true));
      task.progress = 100;
    } else {
      task.progress = computeProgress(task.todoChecklist);
    }

    logStatusChange(task, previousStatus, req.user);
    await task.save();

    const populated = await populateTask(task._id);
    res.json({ message: "Task status updated", task: populated });
  } catch (error) {
    sendError(res, error);
  }
};

// @desc    Tick / untick checklist items
// @route   PUT /api/tasks/:id/todo
// @access  Private (task owner or assignee)
//
// Only the `completed` flag of existing items can change here. Item text is
// edited by the admin through PUT /api/tasks/:id, so a member can't rewrite
// the checklist they were given.
const updateTaskChecklist = async (req, res) => {
  try {
    const task = await loadVisibleTask(req, res);
    if (!task) return;

    const { todoChecklist } = req.body;
    if (!Array.isArray(todoChecklist)) {
      return res.status(400).json({ message: "todoChecklist must be an array" });
    }

    const changes = [];
    task.todoChecklist.forEach((item, index) => {
      const incoming =
        todoChecklist.find((t) => t?._id && t._id.toString() === item._id.toString()) ||
        todoChecklist[index];
      if (!incoming) return;

      const completed = Boolean(incoming.completed);
      if (completed !== item.completed) {
        item.completed = completed;
        changes.push(`${completed ? "completed" : "unchecked"} "${item.text}"`);
      }
    });

    if (!changes.length) {
      const populated = await populateTask(task._id);
      return res.json({ message: "No checklist changes", task: populated });
    }

    changes.forEach((message) => addActivity(task, "checklist", message, req.user));

    const previousStatus = task.status;
    syncProgressFromChecklist(task);
    logStatusChange(task, previousStatus, req.user, "based on checklist");

    await task.save();
    const populated = await populateTask(task._id);
    res.json({ message: "Task checklist updated", task: populated });
  } catch (error) {
    sendError(res, error);
  }
};

// @desc    Add a progress note / comment to a task
// @route   POST /api/tasks/:id/comments
// @access  Private (task owner or assignee)
const addTaskComment = async (req, res) => {
  try {
    const task = await loadVisibleTask(req, res);
    if (!task) return;

    const text = (req.body.text || "").trim();
    if (!text) return res.status(400).json({ message: "Comment cannot be empty" });
    if (text.length > 1000) {
      return res.status(400).json({ message: "Comment must be 1000 characters or fewer" });
    }

    addActivity(task, "comment", text, req.user);
    await task.save();

    const populated = await populateTask(task._id);
    res.status(201).json({ message: "Comment added", task: populated });
  } catch (error) {
    sendError(res, error);
  }
};

// Shared by both dashboards: everything is computed inside `scope`.
const buildDashboardData = async (scope) => {
  const now = new Date();
  const [totalTasks, pendingTasks, inProgressTasks, completedTasks, overdueTasks] =
    await Promise.all([
      Task.countDocuments(scope),
      Task.countDocuments({ ...scope, status: "Pending" }),
      Task.countDocuments({ ...scope, status: "In Progress" }),
      Task.countDocuments({ ...scope, status: "Completed" }),
      Task.countDocuments({ ...scope, status: { $ne: "Completed" }, dueDate: { $lt: now } }),
    ]);

  const taskDistribution = {
    Pending: pendingTasks,
    InProgress: inProgressTasks,
    Completed: completedTasks,
    All: totalTasks,
  };

  const priorityRaw = await Task.aggregate([
    { $match: scope },
    { $group: { _id: "$priority", count: { $sum: 1 } } },
  ]);
  const taskPriorityLevels = ["Low", "Medium", "High"].reduce((acc, priority) => {
    acc[priority] = priorityRaw.find((item) => item._id === priority)?.count || 0;
    return acc;
  }, {});

  const recentTasks = await Task.find(scope)
    .sort({ createdAt: -1 })
    .limit(10)
    .select("title status priority progress dueDate createdAt");

  return {
    statistics: { totalTasks, pendingTasks, inProgressTasks, completedTasks, overdueTasks },
    charts: { taskDistribution, taskPriorityLevels },
    recentTasks,
  };
};

// @desc    Dashboard data for the logged-in admin (only their tasks)
// @route   GET /api/tasks/dashboard-data
// @access  Private (Admin)
const getDashboardData = async (req, res) => {
  try {
    res.status(200).json(await buildDashboardData({ createdBy: req.user._id }));
  } catch (error) {
    sendError(res, error);
  }
};

// @desc    Dashboard data for the logged-in member
// @route   GET /api/tasks/user-dashboard-data
// @access  Private
const getUserDashboardData = async (req, res) => {
  try {
    res.status(200).json(await buildDashboardData({ assignedTo: req.user._id }));
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskChecklist,
  addTaskComment,
  getDashboardData,
  getUserDashboardData,
};
