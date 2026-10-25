import React from "react";
import Avatar from "./Avatar";

// `avatars` can be image URLs or user objects ({ name, profileImageUrl })
const AvatarGroup = ({ avatars = [], maxVisible = 3 }) => {
  const items = avatars.map((item) =>
    typeof item === "string" || item == null
      ? { profileImageUrl: item, name: "" }
      : item
  );

  return (
    <div className="flex items-center">
      {items.slice(0, maxVisible).map((user, index) => (
        <div key={user._id || index} className="-ml-3 first:ml-0 rounded-full border-2 border-white">
          <Avatar src={user.profileImageUrl} name={user.name} />
        </div>
      ))}
      {items.length > maxVisible && (
        <div className="w-9 h-9 flex items-center justify-center bg-blue-50 text-sm font-medium rounded-full border-2 border-white -ml-3">
          +{items.length - maxVisible}
        </div>
      )}
    </div>
  );
};

export default AvatarGroup;
