import React, { useEffect, useState } from "react";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosInstance";
import { LuUsers } from "react-icons/lu";
import Modal from "../Modal";
import AvatarGroup from "../AvatarGroup";
import Avatar from "../Avatar";

const SelectUsers = ({ selectedUsers, setSelectedUsers }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempSelectedUsers, setTempSelectedUsers] = useState([]);

  const getAllUsers = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.USERS.GET_ALL_USERS);
      if (response.data?.length > 0) {
        setAllUsers(response.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const toggleUserSelection = (userId) => {
    setTempSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAssign = () => {
    setSelectedUsers(tempSelectedUsers);
    setIsModalOpen(false);
  };

  // Start the modal from the current selection. Previously it always opened
  // empty when editing a task, so pressing DONE silently unassigned everyone.
  const openModal = () => {
    setTempSelectedUsers(selectedUsers);
    setIsModalOpen(true);
  };

  const selectedUserAvatars = allUsers.filter((user) =>
    selectedUsers.includes(user._id)
  );

  useEffect(() => {
    getAllUsers();
  }, []);

  return (
    <div className="space-y-4 mt-2">
      {selectedUserAvatars.length === 0 && (
        <button className="card-btn" type="button" onClick={openModal} style={{ borderColor: "#dbd3d3" , height: "46px"}}>
          <LuUsers className="text-sm" /> Add Members
        </button>
      )}

      {selectedUserAvatars.length > 0 && (
        <div className="cursor-pointer" onClick={openModal}>
          <AvatarGroup avatars={selectedUserAvatars} maxVisible={3} />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Users"
      >
        <div className="space-y-4 h-[60vh] overflow-y-auto">
            {allUsers.length === 0 && (
              <p className="text-sm text-gray-500 p-3">
                No team members yet. Members appear here once they sign up.
              </p>
            )}
            {allUsers.map((user) => (
            <label
              key={user._id}
              className="flex items-center gap-4 p-3 border-b border-gray-200 cursor-pointer"
            >
              <Avatar src={user.profileImageUrl} name={user.name} className="w-10 h-10" />
              <div className="flex-1">
                <p className="font-medium text-gray-800 dark:text-white">
                  {user.name}
                </p>
                <p className="text-[13px] text-gray-500">{user.email}</p>
              </div>

              <input
                type="checkbox"
                checked={tempSelectedUsers.includes(user._id)}
                onChange={() => toggleUserSelection(user._id)}
                style={{ borderColor: "#dbd3d3" }}
                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded-sm outline-none"
              />
            </label>
          ))}
        </div>

         <div className="flex justify-end gap-4 pt-4">
          <button type="button" className="card-btn" onClick={() => setIsModalOpen(false)}>
            CANCEL
          </button>
          <button type="button" className="card-btn-fill" onClick={handleAssign}>
            DONE
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default SelectUsers;
