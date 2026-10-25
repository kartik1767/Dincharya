import React, { useState } from "react";
import moment from "moment";
import { LuSend } from "react-icons/lu";
import Avatar from "./Avatar";

// Timeline of everything that happened on a task + a box to post progress
// notes. Newest entries first.
const TaskActivity = ({ activity = [], onAddComment, canComment }) => {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;

    setSending(true);
    const ok = await onAddComment(value);
    setSending(false);
    if (ok) setText("");
  };

  const entries = [...activity].reverse();

  return (
    <div className="form-card">
      <h3 className="text-base font-medium">Activity & Updates</h3>

      {canComment && (
        <form onSubmit={handleSubmit} className="mt-3">
          <textarea
            rows={2}
            maxLength={1000}
            value={text}
            onChange={({ target }) => setText(target.value)}
            placeholder="Post a progress update or note..."
            className="form-input resize-none"
            style={{ borderColor: "#dbd3d3" }}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="card-btn-fill disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LuSend className="text-sm" /> {sending ? "Posting..." : "Post Update"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-4 max-h-[520px] overflow-y-auto pr-1">
        {entries.length === 0 && (
          <p className="text-xs text-gray-400">No activity yet.</p>
        )}

        {entries.map((entry) => {
          const name = entry.user?.name || "Someone";
          return (
            <div key={entry._id} className="flex gap-3">
              <Avatar
                src={entry.user?.profileImageUrl}
                name={name}
                className="w-8 h-8 shrink-0"
                textClassName="text-[10px]"
              />
              <div className="flex-1 min-w-0">
                {entry.type === "comment" ? (
                  <>
                    <p className="text-[12px] text-gray-500">
                      <span className="font-medium text-gray-800">{name}</span> posted an update
                    </p>
                    <p className="text-[13px] text-gray-800 bg-gray-50 border border-gray-100 rounded-md px-3 py-2 mt-1 whitespace-pre-wrap break-words">
                      {entry.message}
                    </p>
                  </>
                ) : (
                  <p className="text-[12px] text-gray-600 break-words">
                    <span className="font-medium text-gray-800">{name}</span> {entry.message}
                  </p>
                )}
                <p
                  className="text-[11px] text-gray-400 mt-0.5"
                  title={moment(entry.createdAt).format("Do MMM YYYY, h:mm a")}
                >
                  {moment(entry.createdAt).fromNow()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskActivity;
