import React from "react";

import { Outlet } from "react-router-dom";
import OrganizerNavBar from "../../../components/organizer/OrganizerNavBar";
import OrganizerSideBar from "../../../components/organizer/OrganizerSideBar";

const OrganizerLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <OrganizerNavBar />
      <div className="flex flex-1">
        <OrganizerSideBar />
        <main className="flex-1 p-6 md:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OrganizerLayout;
