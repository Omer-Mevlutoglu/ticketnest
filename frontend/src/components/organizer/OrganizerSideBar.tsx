import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboardIcon, PlusSquareIcon, HomeIcon } from "lucide-react";

const links = [
  {
    name: "Dashboard",
    path: "/organizer",
    icon: <HomeIcon className="w-5 h-5" />,
  },
  {
    name: "My Events",
    path: "/organizer/myevents",
    icon: <LayoutDashboardIcon className="w-5 h-5" />,
  },
  {
    name: "Create Event",
    path: "/organizer/events/new",
    icon: <PlusSquareIcon className="w-5 h-5" />,
  },
];

const OrganizerSideBar: React.FC = () => {
  return (
    <div className="h-[calc(100vh-64px)] md:flex flex-col items-center pt-8 w-[3.25rem] md:w-60 border-r border-gray-300/20 text-sm">
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
                {link.icon}
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
