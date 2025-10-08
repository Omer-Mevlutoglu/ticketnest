import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboardIcon,
  PlusSquareIcon,
  CalendarRangeIcon,
} from "lucide-react";

const links = [
  {
    name: "My Events",
    path: "/organizer/myevents",
    icon: <LayoutDashboardIcon />,
  },
  {
    name: "Create Event",
    path: "/organizer/events/new",
    icon: <PlusSquareIcon />,
  },
  {
    name: "Schedules",
    path: "/organizer/schedules",
    icon: <CalendarRangeIcon />,
  },
];

const OrganizerSideBar: React.FC = () => {
  return (
    <div className="h-[calc(100vh-64px)] md:flex flex-col items-center pt-8 w-[3.25rem] md:w-60 border-r border-gray-300/20 text-sm">
      {/* Avatar placeholder (no external assets) */}
      <div className="rounded-full h-9 md:h-14 w-9 md:w-14 mx-auto grid place-items-center bg-white/10 text-sm font-semibold">
        O
      </div>
      <p className="mt-2 text-base hidden md:block">Organizer</p>

      <div className="w-full">
        {links.map((link, idx) => (
          <NavLink
            key={idx}
            to={link.path}
            end
            className={({ isActive }) =>
              `relative flex items-center gap-2 w-full py-2.5 first:mt-6 text-gray-400
               justify-center md:justify-start md:pl-10
               ${isActive ? "bg-primary/15 text-primary group" : ""}`
            }
          >
            {({ isActive }) => (
              <>
                {React.cloneElement(link.icon as React.ReactElement, {
                //   className: "w-5 h-5",
                })}
                <p className="hidden md:block">{link.name}</p>
                <span
                  className={`w-1.5 h-10 rounded-l right-0 absolute ${
                    isActive ? "bg-primary" : ""
                  }`}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default OrganizerSideBar;
