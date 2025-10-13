// src/admin/components/AdminNavBar.tsx
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
    <div className="flex items-center justify-between px-6 md:px-10 h-16 border-b border-gray-300/30">
      <Link to="/" className="font-semibold tracking-wide">
        CrowdJoy <span className="text-primary">Admin</span>
      </Link>

      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 transition"
        title="Logout"
      >
        <LogOut className="w-4 h-4" />
        Logout
      </button>
    </div>
  );
};

export default AdminNavBar;
