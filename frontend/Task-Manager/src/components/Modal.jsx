import React from "react";

const Modal = ({ children, isOpen, onClose, title, className = "" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 p-4 backdrop-blur-[1.5px]">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[22px] border border-slate-200/70 bg-[#f5f5f6] shadow-[0_25px_80px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between bg-[#2e4057] px-6 py-5 sm:px-8">
          <h3 className="text-2xl sm:text-[2.1rem] font-semibold tracking-[-0.03em] text-white">
            {title}
          </h3>

          <button
            type="button"
            aria-label="Close modal"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <svg
              className="h-6 w-6"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 14"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
              />
            </svg>
          </button>
        </div>

        <div className={`bg-[#f6f7f9] p-6 sm:p-8 ${className}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
