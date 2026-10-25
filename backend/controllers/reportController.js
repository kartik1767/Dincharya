const Task = require("../models/Task");
const User = require("../models/User");
const excelJS = require("exceljs");
const { sendError } = require("../utils/errors");

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Dates are formatted in the downloader's time zone (sent as ?tz=America/New_York)
// so a task due "25 Oct" doesn't show up as 26 Oct in the spreadsheet.
const resolveTimeZone = (tz) => {
  try {
    if (tz) {
      new Intl.DateTimeFormat("en-CA", { timeZone: tz });
      return tz;
    }
  } catch {
    /* invalid zone, fall through */
  }
  return "UTC";
};

const dateFormatter = (timeZone) => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return (date) => (date ? fmt.format(new Date(date)) : ""); // YYYY-MM-DD
};

const styleHeader = (worksheet) => {
  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1368EC" } };
  header.alignment = { vertical: "middle" };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
};

const sendWorkbook = async (res, workbook, filename) => {
  // Build the file in memory first: if anything fails we can still send a
  // JSON error instead of a half-written spreadsheet.
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader("Content-Type", XLSX_MIME);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Length", buffer.length);
  res.end(Buffer.from(buffer));
};

// @desc    Export the logged-in admin's tasks as an Excel file
// @route   GET /api/reports/export/tasks
// @access  Private (Admin)
const exportTasksReport = async (req, res) => {
  try {
    const formatDate = dateFormatter(resolveTimeZone(req.query.tz));
    const tasks = await Task.find({ createdBy: req.user._id })
      .select("-activity")
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name email");

    const workbook = new excelJS.Workbook();
    workbook.creator = "Dincharya";
    const worksheet = workbook.addWorksheet("Tasks Report");

    worksheet.columns = [
      { header: "Task ID", key: "_id", width: 26 },
      { header: "Title", key: "title", width: 30 },
      { header: "Description", key: "description", width: 50 },
      { header: "Priority", key: "priority", width: 12 },
      { header: "Status", key: "status", width: 14 },
      { header: "Progress (%)", key: "progress", width: 13 },
      { header: "Checklist Done", key: "checklist", width: 15 },
      { header: "Created On", key: "createdAt", width: 13 },
      { header: "Started On", key: "startedAt", width: 13 },
      { header: "Completed On", key: "completedAt", width: 14 },
      { header: "Due Date", key: "dueDate", width: 13 },
      { header: "Overdue", key: "overdue", width: 10 },
      { header: "Assigned To", key: "assignedTo", width: 40 },
    ];

    const now = new Date();
    tasks.forEach((task) => {
      const assignedTo = (task.assignedTo || [])
        .filter(Boolean) // users deleted after assignment populate as null
        .map((user) => `${user.name} (${user.email})`)
        .join(", ");
      const done = task.todoChecklist.filter((item) => item.completed).length;
      const overdue = task.status !== "Completed" && task.dueDate && task.dueDate < now;

      worksheet.addRow({
        _id: task._id.toString(),
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        status: task.status,
        progress: task.progress || 0,
        checklist: `${done} / ${task.todoChecklist.length}`,
        createdAt: formatDate(task.createdAt),
        startedAt: formatDate(task.startedAt),
        completedAt: formatDate(task.completedAt),
        dueDate: formatDate(task.dueDate),
        overdue: overdue ? "Yes" : "No",
        assignedTo: assignedTo || "Unassigned",
      });
    });

    styleHeader(worksheet);
    await sendWorkbook(res, workbook, `tasks_report_${formatDate(new Date())}.xlsx`);
  } catch (error) {
    sendError(res, error);
  }
};

// @desc    Export a per-member summary of the logged-in admin's tasks
// @route   GET /api/reports/export/users
// @access  Private (Admin)
const exportUsersReport = async (req, res) => {
  try {
    const formatDate = dateFormatter(resolveTimeZone(req.query.tz));
    const users = await User.find({ role: "member" }).select("name email _id").lean();
    const tasks = await Task.find({ createdBy: req.user._id })
      .select("assignedTo status dueDate")
      .lean();

    const userTaskMap = {};
    users.forEach((user) => {
      userTaskMap[user._id.toString()] = {
        name: user.name,
        email: user.email,
        taskCount: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
      };
    });

    const now = new Date();
    tasks.forEach((task) => {
      (task.assignedTo || []).forEach((userId) => {
        const entry = userTaskMap[userId.toString()];
        if (!entry) return;
        entry.taskCount += 1;
        if (task.status === "Pending") entry.pendingTasks += 1;
        else if (task.status === "In Progress") entry.inProgressTasks += 1;
        else if (task.status === "Completed") entry.completedTasks += 1;
        if (task.status !== "Completed" && task.dueDate < now) entry.overdueTasks += 1;
      });
    });

    const workbook = new excelJS.Workbook();
    workbook.creator = "Dincharya";
    const worksheet = workbook.addWorksheet("User Task Report");

    worksheet.columns = [
      { header: "User Name", key: "name", width: 30 },
      { header: "Email", key: "email", width: 40 },
      { header: "Total Assigned Tasks", key: "taskCount", width: 20 },
      { header: "Pending Tasks", key: "pendingTasks", width: 15 },
      { header: "In Progress Tasks", key: "inProgressTasks", width: 18 },
      { header: "Completed Tasks", key: "completedTasks", width: 17 },
      { header: "Overdue Tasks", key: "overdueTasks", width: 15 },
      { header: "Completion Rate (%)", key: "completionRate", width: 20 },
    ];

    Object.values(userTaskMap).forEach((entry) => {
      worksheet.addRow({
        ...entry,
        completionRate: entry.taskCount
          ? Math.round((entry.completedTasks / entry.taskCount) * 100)
          : 0,
      });
    });

    styleHeader(worksheet);
    await sendWorkbook(res, workbook, `users_report_${formatDate(new Date())}.xlsx`);
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = { exportTasksReport, exportUsersReport };
