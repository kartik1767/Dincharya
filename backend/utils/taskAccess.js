// Centralised ownership / visibility rules for tasks.
//
// - An admin only sees and manages tasks they created (createdBy).
// - A member only sees tasks they are assigned to.

const toId = (value) => {
  if (!value) return null;
  return (value._id || value).toString();
};

const isTaskOwner = (task, user) =>
  user?.role === "admin" && toId(task.createdBy) === toId(user._id);

const isAssignee = (task, user) =>
  (task.assignedTo || []).some((assignee) => toId(assignee) === toId(user?._id));

const canViewTask = (task, user) => isTaskOwner(task, user) || isAssignee(task, user);

// Base Mongo filter for "tasks this user is allowed to see"
const taskScope = (user) =>
  user.role === "admin" ? { createdBy: user._id } : { assignedTo: user._id };

module.exports = { toId, isTaskOwner, isAssignee, canViewTask, taskScope };
