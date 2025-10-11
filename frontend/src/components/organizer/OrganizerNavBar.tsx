/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

function deriveFirstName(user: { email?: string } & Record<string, any>) {
  const username = (user as any)?.username as string | undefined;
  const base = username ?? (user.email ? user.email.split("@")[0] : "User");
  const first = base.split(/[.\-_ ]+/)[0] || base;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

const OrganizerNavBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const firstName = user ? deriveFirstName(user) : "User";
  const initial = firstName[0]?.toUpperCase() ?? "U";

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/login");
  };

  return (
    <div className="flex items-center justify-between px-6 md:px-10 h-16 border-b border-gray-300/30">
      <Link to="/organizer/myevents" className="font-semibold tracking-wide">
        CrowdJoy <span className="text-primary">Organizer</span>
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
        >
          <span className="w-9 h-9 rounded-full bg-primary text-white grid place-items-center font-semibold">
            {initial}
          </span>
          <span className="hidden sm:block text-sm font-medium">
            {firstName}
          </span>
          <ChevronDown className="w-4 h-4 opacity-80" />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 min-w-[180px] rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur p-1 shadow-xl z-10"
          >
            <button
              className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-white/10"
              onClick={() => {
                setOpen(false);
                navigate("/organizer/myevents");
              }}
            >
              My Events
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-white/10"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerNavBar;
