import React from "react";

const Progress = ({ progress = 0, status, showLabel = false }) => {
  const getColor = () => {
    switch (status) {
      case "In Progress":
        return "bg-cyan-500";
      case "Completed":
        return "bg-indigo-500";
      default:
        return "bg-violet-500";
    }
  };

  const value = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <div className="flex items-center gap-2">
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`${getColor()} h-1.5 rounded-full transition-all duration-300`}
          style={{ width: `${value}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[11px] font-medium text-gray-600 w-9 text-right">{value}%</span>
      )}
    </div>
  );
};

export default Progress;
