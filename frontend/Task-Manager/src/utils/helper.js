import moment from "moment";

export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const addThousandsSeparator = (num) => {
  if (num == null || isNaN(num)) return "";

  const [integerPart, fractionalPart] = num.toString().split(".");
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return fractionalPart
    ? `${formattedInteger}.${fractionalPart}`
    : formattedInteger;
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

export const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

// A task is overdue once its due *day* has passed and it isn't completed
export const isOverdue = (dueDate, status) =>
  Boolean(dueDate) &&
  status !== "Completed" &&
  moment(dueDate).endOf("day").isBefore(moment());

export const getHomeRoute = (role) =>
  role === "admin" ? "/admin/dashboard" : "/user/dashboard";

export const getTaskDetailsRoute = (role, taskId) =>
  role === "admin" ? `/admin/task-details/${taskId}` : `/user/task-details/${taskId}`;
