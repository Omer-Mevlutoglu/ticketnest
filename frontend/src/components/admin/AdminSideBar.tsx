// src/components/admin/AdminSideBar.tsx
import React from "react";
import {
  LayoutDashboardIcon,
  ListCollapseIcon,
  ListIcon,
  PlusSquareIcon,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";

type User = {
  firstName: string;
  lastName: string;
  imageUrl: string;
};

type AdminNavLink = {
  name: string;
  path: string;
  icon: LucideIcon; // render as a component for clean TS types
};

const AdminSideBar: React.FC = () => {
  const user: User = {
    firstName: "Admin",
    lastName: "Omer",
    imageUrl: "/vite.svg" as string,
  };

  const adminNavLinks: AdminNavLink[] = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboardIcon },
    { name: "Add-venue", path: "/admin/add-venue", icon: PlusSquareIcon },
    { name: "List Events", path: "/admin/list-events", icon: ListIcon },
    { name: "Requests", path: "/admin/requests", icon: ListIcon },
    {
      name: "List Bookings",
      path: "/admin/list-bookings",
      icon: ListCollapseIcon,
    },
  ];

  return (
    <div className="h-[calc(100vh-64px)] md:flex flex-col items-center pt-8 w-[3.25rem] md:w-60 border-r border-gray-300/20 text-sm">
      <img
        src={user.imageUrl}
        alt={`${user.firstName} ${user.lastName}`}
        className="rounded-full h-9 md:h-14 w-9 md:w-14 mx-auto"
      />

      <p className="mt-2 text-base hidden md:block">
        {user.firstName} {user.lastName}
      </p>

      <div className="w-full">
        {adminNavLinks.map(({ name, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end
            className={({ isActive }) =>
              [
                "relative flex items-center gap-2 w-full py-2.5 first:mt-6 text-gray-400",
                "justify-center md:justify-start md:pl-10",
                isActive ? "bg-primary/15 text-primary group" : "",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-4 w-4" />
                <p className="hidden md:block">{name}</p>
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

export default AdminSideBar;
