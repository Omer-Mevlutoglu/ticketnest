import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboardIcon,
  ListIcon,
  PlusSquareIcon,
  ClipboardListIcon,
  UsersIcon,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

type AdminNavLink = {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
};

function deriveFirstName(email?: string, username?: string) {
  const base = username ?? (email ? email.split("@")[0] : "Admin");
  const first = base.split(/[.\-_ ]+/)[0] || base;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

const AdminSideBar: React.FC = () => {
  const { user } = useAuth();
  const firstName = deriveFirstName(user?.email, user?.username);
  const initial = firstName[0]?.toUpperCase() ?? "A";

  /** keep routes consistent with App.tsx plan */
  const adminNavLinks: AdminNavLink[] = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboardIcon },
    {
      name: "Organizer Requests",
      path: "/admin/requests",
      icon: ClipboardListIcon,
    },
    { name: "List Venues", path: "/admin/venue-list", icon: ListIcon },
    { name: "Add Venue", path: "/admin/venue-create", icon: PlusSquareIcon },
    { name: "Bookings", path: "/admin/list-bookings", icon: ClipboardListIcon }, // placeholder
    { name: "Users", path: "/admin/users", icon: UsersIcon }, // placeholder
  ];

  return (
    <div className="h-[calc(100vh-64px)] md:flex flex-col items-center pt-8 w-[3.25rem] md:w-60 border-r border-gray-300/20 text-sm">
      {/* circular avatar */}
      <div className="rounded-full h-9 md:h-14 w-9 md:w-14 mx-auto grid place-items-center bg-white/10 text-sm font-semibold">
        {initial}
      </div>
      <p className="mt-2 text-base hidden md:block">{firstName}</p>

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
