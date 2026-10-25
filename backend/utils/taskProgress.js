// Status / progress rules shared by every endpoint that can change a task.

const STATUSES = ["Pending", "In Progress", "Completed"];

const computeProgress = (checklist = []) => {
  if (!checklist.length) return 0;
  const done = checklist.filter((item) => item.completed).length;
  return Math.round((done / checklist.length) * 100);
};

// Applies a status and keeps startedAt / completedAt consistent with it.
const applyStatus = (task, status) => {
  task.status = status;
  const now = new Date();

  if (status === "Pending") {
    task.startedAt = null;
    task.completedAt = null;
  } else if (status === "In Progress") {
    if (!task.startedAt) task.startedAt = now;
    task.completedAt = null;
  } else if (status === "Completed") {
    if (!task.startedAt) task.startedAt = now;
    task.completedAt = now;
  }
};

// Recalculate progress after the checklist changed and move the status along:
//   all items done            -> Completed
//   was Completed, now not    -> In Progress (task re-opened)
//   some items done           -> In Progress
//   nothing done              -> keep current status (a member may have
//                                clicked "Start Working" before ticking anything)
const syncProgressFromChecklist = (task) => {
  if (!task.todoChecklist?.length) return; // status is managed manually

  task.progress = computeProgress(task.todoChecklist);

  if (task.progress === 100) {
    if (task.status !== "Completed") applyStatus(task, "Completed");
  } else if (task.status === "Completed" || task.progress > 0) {
    if (task.status !== "In Progress") applyStatus(task, "In Progress");
  }
};

const addActivity = (task, type, message, user) => {
  task.activity.push({ type, message, user: user?._id });
};

module.exports = {
  STATUSES,
  computeProgress,
  applyStatus,
  syncProgressFromChecklist,
  addActivity,
};
