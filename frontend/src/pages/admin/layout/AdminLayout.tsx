// src/admin/layout/AdminLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import AdminNavBar from "../../../components/admin/AdminNavBar";
import AdminSideBar from "../../../components/admin/AdminSideBar";

const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0C] text-white">
      {/* Top bar */}
      <AdminNavBar />

      {/* Content row: sidebar + page */}
      <div className="flex">
        <AdminSideBar />
        <main className="flex-1 p-6 md:p-10">
          {/* Child routes render here */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
