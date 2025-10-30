/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "../../../context/AuthContext"; // Adjusted path

// Utility function to derive first name (kept from previous version)
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

  // Close dropdown on click outside (unchanged)
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
    // Added w-full explicitly
    <div className="w-full flex items-center justify-between px-4 sm:px-6 md:px-10 h-16 border-b border-gray-300/30 flex-shrink-0 bg-zinc-900 z-10 sticky top-0">
      {/* Title section - allow wrapping if needed */}
      <Link
        to="/organizer"
        className="font-semibold tracking-wide text-sm sm:text-base min-w-0 mr-2"
      >
        {" "}
        {/* Added min-w-0, mr-2 */}
        CrowdJoy{" "}
        <span className="text-primary hidden sm:inline">Organizer</span>{" "}
        {/* Hide Organizer on xs */}
      </Link>

      {/* User menu section */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          // Use padding instead of gap for better control on small screens
          className="flex items-center space-x-2 p-1 rounded hover:bg-white/10" // Added padding and hover
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
        >
          <span className="w-8 h-8 rounded-full bg-primary text-white grid place-items-center font-semibold text-sm">
            {" "}
            {/* Slightly smaller avatar */}
            {initial}
          </span>
          {/* Name hidden on small screens is correct */}
          <span className="hidden sm:block text-sm font-medium">
            {firstName}
          </span>
          <ChevronDown className="w-4 h-4 opacity-80 flex-shrink-0" />{" "}
          {/* Ensure icon doesn't shrink */}
        </button>

        {open && (
          <div
            role="menu"
            // Ensure dropdown doesn't cause overflow
            className="absolute right-0 mt-2 w-48 max-w-[calc(100vw-2rem)] rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur p-1 shadow-xl z-20" // Added max-w, increased z-index
          >
            {/* Added Dashboard Link */}
            <button
              className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-white/10"
              onClick={() => {
                setOpen(false);
                navigate("/organizer");
              }}
            >
              Dashboard
            </button>
            <button
              className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-white/10"
              onClick={() => {
                setOpen(false);
                navigate("/organizer/myevents");
              }}
            >
              My Events
            </button>
            {/* Added Create Link */}
            <button
              className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-white/10"
              onClick={() => {
                setOpen(false);
                navigate("/organizer/events/new");
              }}
            >
              Create Event
            </button>
            <div className="my-1 h-px bg-white/10" /> {/* Separator */}
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
