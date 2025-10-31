import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

const AdminNavBar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    // Make navbar sticky and add background
    <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 md:px-10 h-16 border-b border-gray-300/30 bg-[#0B0B0C]">
      {/* Updated link to point to /admin */}
      <Link to="/admin" className="font-semibold tracking-wide min-w-0">
        {" "}
        {/* Added min-w-0 for shrinking */}
        <span className="truncate">
          {" "}
          {/* Added truncate for safety */}
          CrowdJoy <span className="text-primary hidden sm:inline">
            Admin
          </span>{" "}
          {/* Hide "Admin" below sm */}
        </span>
      </Link>

      <button
        onClick={handleLogout}
        className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-md bg-white/10 hover:bg-white/15 transition flex-shrink-0" // Reduced padding on mobile
        title="Logout"
      >
        <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />{" "}
        {/* Slightly smaller icon on mobile */}
        <span className="hidden sm:inline">Logout</span>{" "}
        {/* Hide text on smallest screens */}
      </button>
    </div>
  );
};

export default AdminNavBar;
