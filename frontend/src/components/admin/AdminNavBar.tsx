import React from "react";
import { Link } from "react-router-dom";

const AdminNavBar: React.FC = () => {
  return (
    <div className="flex items-center justify-between px-6 md:px-10 h-20 border-b border-gray-300/30">
      <Link to="/" className="max-md:flex-1">
        <img
          src="../../../assets/images/logo.png"
          alt="Logo"
          className="w-26 h-auto"
        />
      </Link>
    </div>
  );
};

export default AdminNavBar;
