import React from "react";
import { Outlet } from "react-router-dom";
import OrganizerNavBar from "../../components/organizer/OrganizerNavBar";
import OrganizerSideBar from "../../components/organizer/OrganizerSideBar";

const OrganizerLayout: React.FC = () => {
  return (
    <>
      <OrganizerNavBar />
      <div className="flex">
        <OrganizerSideBar />
        <div className="flex-1 px-4 py-10 md:px-10 h-[calc(100vh-64px)] overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default OrganizerLayout;
