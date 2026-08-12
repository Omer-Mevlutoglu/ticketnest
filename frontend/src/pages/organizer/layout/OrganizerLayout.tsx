import React from "react";

import { Outlet } from "react-router-dom";
import OrganizerNavBar from "@/components/organizer/OrganizerNavBar";
import OrganizerSideBar from "@/components/organizer/OrganizerSideBar";
import { DemoWriteNotice } from "@/components/DemoModeNotice";
import { useAuth } from "@/context/AuthContext";

const OrganizerLayout: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <OrganizerNavBar />
      <div className="flex flex-1">
        <OrganizerSideBar />
        <main className="flex-1 p-6 md:p-10">
          {user?.canPerformProtectedWrites === false && <DemoWriteNotice />}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OrganizerLayout;
