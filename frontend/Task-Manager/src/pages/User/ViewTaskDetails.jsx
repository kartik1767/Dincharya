import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import moment from "moment";
import {
  LuSquareArrowOutUpRight,
  LuPlay,
  LuCircleCheck,
  LuRotateCcw,
  LuPencil,
  LuUndo2,
} from "react-icons/lu";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { UserContext } from "../../context/userContext";
import { isOverdue } from "../../utils/helper";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import AvatarGroup from "../../components/AvatarGroup";
import Progress from "../../components/Progress";
import Modal from "../../components/Modal";
import TaskActivity from "../../components/TaskActivity";

const getStatusTagColor = (status) => {
  switch (status) {
    case "In Progress":
      return "text-cyan-500 bg-cyan-50 border border-cyan-500/10";
    case "Completed":
      return "text-lime-500 bg-lime-50 border border-lime-500/20";
    default:
      return "text-violet-500 bg-violet-50 border border-violet-500/10";
  }
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;

// Shared by members (/user/task-details/:id) and admins (/admin/task-details/:id)
const ViewTaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === "admin";

  const [task, setTask] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);

  const getTaskDetailsByID = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.TASKS.GET_TASK_BY_ID(id));
      if (response.data) setTask(response.data);
    } catch (error) {
      console.error("Error fetching task:", error);
      if (error.response?.status === 404) setNotFound(true);
    }
  };

  const updateStatus = async (status) => {
    setBusy(true);
    try {
      const response = await axiosInstance.put(API_PATHS.TASKS.UPDATE_TASK_STATUS(id), {
        status,
      });
      setTask(response.data?.task);
      toast.success(
        status === "In Progress"
          ? "Task started. Good luck!"
          : status === "Completed"
          ? "Task marked as completed"
          : "Task moved back to Pending"
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't update the status"));
    } finally {
      setBusy(false);
      setConfirmComplete(false);
    }
  };

  const handleMarkComplete = () => {
    const remaining = task.todoChecklist.filter((item) => !item.completed).length;
    if (remaining > 0) {
      setConfirmComplete(true); // ask first, this ticks every remaining item
    } else {
      updateStatus("Completed");
    }
  };

  // Tick / untick one checklist item (optimistic update, reverted on failure)
  const updateTodoChecklist = async (index) => {
    if (busy) return;
    const previousTask = task;
    const todoChecklist = task.todoChecklist.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    );
    setTask({ ...task, todoChecklist });
    setBusy(true);

    try {
      const response = await axiosInstance.put(
        API_PATHS.TASKS.UPDATE_TODO_CHECKLIST(id),
        { todoChecklist }
      );
      const updated = response.data?.task;
      if (updated) {
        if (updated.status === "Completed" && previousTask.status !== "Completed") {
          toast.success("All items done. Task completed!");
        }
        setTask(updated);
      }
    } catch (error) {
      setTask(previousTask);
      toast.error(getErrorMessage(error, "Couldn't update the checklist"));
    } finally {
      setBusy(false);
    }
  };

  const addComment = async (text) => {
    try {
      const response = await axiosInstance.post(API_PATHS.TASKS.ADD_COMMENT(id), { text });
      setTask(response.data?.task);
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't post the update"));
      return false;
    }
  };

  const handleLinkClick = (link) => {
    if (!/^https?:\/\//i.test(link)) {
      link = "https://" + link; // Default to HTTPS
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (id) getTaskDetailsByID();
    return () => {};
  }, [id]);

  const doneCount = task?.todoChecklist?.filter((item) => item.completed).length || 0;
  const totalCount = task?.todoChecklist?.length || 0;
  const overdue = task && isOverdue(task.dueDate, task.status);

  return (
    <DashboardLayout activeMenu={isAdmin ? "Manage Tasks" : "My Tasks"}>
      <div className="mt-5 mb-10">
        {notFound && (
          <div className="form-card text-sm text-gray-600">
            This task doesn&apos;t exist or you don&apos;t have access to it.
          </div>
        )}

        {task && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-4">
            <div className="lg:col-span-2 space-y-5">
              <div className="form-card">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-sm md:text-xl font-medium">{task.title}</h2>

                  <div className="flex items-center gap-2 shrink-0">
                    {overdue && (
                      <div className="text-[11px] md:text-[13px] font-medium text-red-600 bg-red-50 border border-red-500/20 px-3 py-0.5 rounded">
                        Overdue
                      </div>
                    )}
                    <div
                      className={`text-[11px] md:text-[13px] font-medium ${getStatusTagColor(
                        task.status
                      )} px-4 py-0.5 rounded`}
                    >
                      {task.status}
                    </div>
                  </div>
                </div>

                {/* Progress + actions */}
                <div className="mt-5 bg-gray-50 border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-600">Progress</span>
                    <span className="text-xs text-gray-500">
                      {doneCount} / {totalCount} checklist items done
                    </span>
                  </div>
                  <Progress progress={task.progress} status={task.status} showLabel />

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                    <InfoBox
                      label="Started On"
                      value={task.startedAt ? moment(task.startedAt).format("Do MMM YYYY") : "Not started"}
                    />
                    <InfoBox
                      label="Completed On"
                      value={task.completedAt ? moment(task.completedAt).format("Do MMM YYYY") : "—"}
                    />
                    <InfoBox
                      label="Time Left"
                      value={
                        task.status === "Completed"
                          ? "Done"
                          : overdue
                          ? `Overdue by ${moment(task.dueDate).endOf("day").fromNow(true)}`
                          : `Due ${moment(task.dueDate).endOf("day").fromNow()}`
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4">
                    {task.status === "Pending" && (
                      <button className="card-btn-fill" disabled={busy} onClick={() => updateStatus("In Progress")}>
                        <LuPlay className="text-sm" /> Start Working
                      </button>
                    )}

                    {task.status === "In Progress" && (
                      <>
                        <button className="card-btn-fill" disabled={busy} onClick={handleMarkComplete}>
                          <LuCircleCheck className="text-sm" /> Mark as Completed
                        </button>
                        {doneCount === 0 && (
                          <button className="card-btn" disabled={busy} onClick={() => updateStatus("Pending")}>
                            <LuUndo2 className="text-sm" /> Move back to Pending
                          </button>
                        )}
                      </>
                    )}

                    {task.status === "Completed" && (
                      <button className="card-btn" disabled={busy} onClick={() => updateStatus("In Progress")}>
                        <LuRotateCcw className="text-sm" /> Reopen Task
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        className="card-btn ml-auto"
                        onClick={() => navigate("/admin/create-task", { state: { taskId: task._id } })}
                      >
                        <LuPencil className="text-sm" /> Edit Task
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <InfoBox label="Description" value={task.description} />
                </div>

                <div className="grid grid-cols-12 gap-4 mt-4">
                  <div className="col-span-6 md:col-span-4">
                    <InfoBox label="Priority" value={task.priority} />
                  </div>
                  <div className="col-span-6 md:col-span-4">
                    <InfoBox
                      label="Due Date"
                      value={task.dueDate ? moment(task.dueDate).format("Do MMM YYYY") : "N/A"}
                    />
                  </div>
                  <div className="col-span-6 md:col-span-4">
                    <label className="text-xs font-medium text-slate-500">Assigned To</label>
                    <AvatarGroup avatars={task.assignedTo?.filter(Boolean) || []} maxVisible={5} />
                  </div>
                  {task.createdBy?.name && (
                    <div className="col-span-6 md:col-span-4">
                      <InfoBox label="Assigned By" value={task.createdBy.name} />
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <label className="text-xs font-medium text-slate-500">Todo Checklist</label>

                  {task.todoChecklist?.map((item, index) => (
                    <TodoCheckList
                      key={item._id || `todo_${index}`}
                      text={item.text}
                      isChecked={item.completed}
                      disabled={busy}
                      onChange={() => updateTodoChecklist(index)}
                    />
                  ))}
                </div>

                {task.attachments?.length > 0 && (
                  <div className="mt-2">
                    <label className="text-xs font-medium text-slate-500">Attachments</label>

                    {task.attachments.map((link, index) => (
                      <Attachment
                        key={`link_${index}`}
                        link={link}
                        index={index}
                        onClick={() => handleLinkClick(link)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <TaskActivity activity={task.activity} onAddComment={addComment} canComment />
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={confirmComplete}
        onClose={() => setConfirmComplete(false)}
        title="Mark task as completed?"
      >
        <p className="text-[1.15rem] leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">{totalCount - doneCount}</span> checklist
          item(s) are still unchecked. Marking the task as completed will tick all of them.
        </p>
        <div className="mt-8 flex justify-end gap-4">
          <button className="card-btn px-7 py-3 text-base" onClick={() => setConfirmComplete(false)}>
            Cancel
          </button>
          <button
            className="card-btn-fill px-7 py-3 text-base"
            disabled={busy}
            onClick={() => updateStatus("Completed")}
          >
            Mark as Completed
          </button>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default ViewTaskDetails;

const InfoBox = ({ label, value }) => {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <p className="text-[12px] md:text-[13px] font-medium text-gray-700 mt-0.5 whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
};

const TodoCheckList = ({ text, isChecked, onChange, disabled }) => {
  return (
    <label className="flex items-center gap-3 p-3 cursor-pointer">
      <input
        type="checkbox"
        checked={isChecked}
        onChange={onChange}
        disabled={disabled}
        className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded-sm outline-none cursor-pointer"
      />
      <p className={`text-[13px] ${isChecked ? "text-gray-400 line-through" : "text-gray-800"}`}>
        {text}
      </p>
    </label>
  );
};

const Attachment = ({ link, index, onClick }) => {
  return (
    <div
      className="flex justify-between bg-gray-50 border border-gray-100 px-3 py-2 rounded-md mb-3 mt-2 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <span className="text-xs text-gray-400 font-semibold mr-2">
          {index < 9 ? `0${index + 1}` : index + 1}
        </span>
        <p className="text-xs text-black truncate">{link}</p>
      </div>

      <LuSquareArrowOutUpRight className="text-gray-400 shrink-0" />
    </div>
  );
};
