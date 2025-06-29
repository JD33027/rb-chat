import React from 'react';
import { Link } from 'react-router-dom';

const ProfileMenu = ({ onLogout, onClose }) => {
  return (
    <div className="absolute right-0 z-10 w-48 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
      <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button">
        <Link
          to="/edit-profile"
          onClick={onClose}
          className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
          role="menuitem"
        >
          Edit Profile
        </Link>
        <button
          onClick={onLogout}
          className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
          role="menuitem"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default ProfileMenu;