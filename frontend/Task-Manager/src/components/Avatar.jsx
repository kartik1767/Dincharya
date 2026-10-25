import React, { useEffect, useState } from "react";
import { getInitials } from "../utils/helper";

// Profile image with an initials fallback (no broken-image icons for users
// who signed up without a photo).
const Avatar = ({ src, name = "", className = "w-9 h-9", textClassName = "text-xs" }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        title={name}
        onError={() => setFailed(true)}
        className={`${className} rounded-full object-cover bg-slate-200`}
      />
    );
  }

  return (
    <div
      title={name}
      className={`${className} ${textClassName} rounded-full bg-blue-100 text-primary font-semibold flex items-center justify-center select-none`}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
