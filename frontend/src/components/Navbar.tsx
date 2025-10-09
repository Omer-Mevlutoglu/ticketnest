/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MenuIcon, Search, XIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const favoriteEvents = ["1", "2"];

function deriveFirstName(user: { email?: string } & Record<string, any>) {
  const username = (user as any)?.username as string | undefined;
  const base = username ?? (user.email ? user.email.split("@")[0] : "User");
  const first = base.split(/[.\-_ ]+/)[0] || base;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false); // mobile nav
  const [menuOpen, setMenuOpen] = useState(false); // avatar dropdown
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const firstName = user ? deriveFirstName(user) : null;
  const avatarInitial = firstName ? firstName[0].toUpperCase() : "U";

  // Close dropdown on click outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate("/login");
  };

  return (
    <div className="fixed top-0 left-0 z-50 w-full flex items-center justify-between px-6 md:px-16 lg:px-36 py-5">
      <Link to="/" className="max-md:flex-1">
        <img
          src="../../assets/images/logo.png"
          alt="Logo"
          className="w-36 h-auto"
        />
      </Link>

      {/* Center nav links */}
      <div
        className={`max-md:absolute max-md:top-0 max-md:left-0 max-md:font-medium max-md:text-lg z-50 flex flex-col md:flex-row md:items-center
        items-center max-md:justify-center gap-8 md:px-8 py-3 max-md:h-screen md:rounded-full backdrop-blur bg-black/70 md:bg-white/10
        md:border border-gray-300/20 overflow-hidden transition-[width] duration-300 ${
          isOpen ? "max-md:w-full" : "max-md:w-0"
        }`}
      >
        <XIcon
          className="md:hidden absolute top-6 right-6 w-6 h-6 cursor-pointer"
          onClick={() => setIsOpen(!isOpen)}
        />
        <Link onClick={() => setIsOpen(false)} to="/">
          Home
        </Link>
        <Link onClick={() => setIsOpen(false)} to="/events">
          Events
        </Link>

        {favoriteEvents.length > 0 && (
          <Link onClick={() => setIsOpen(false)} to="/favorite">
            Favorite
          </Link>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-8">
        <Search className="w-6 h-6 max-md:hidden cursor-pointer" />

        {!user ? (
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-1 sm:px-7 sm:py-2 bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
          >
            Login
          </button>
        ) : (
          <div className="relative" ref={menuRef}>
            {/* Avatar button */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title={firstName || "Account"}
            >
              <span className="w-9 h-9 rounded-full bg-primary text-white grid place-items-center font-semibold">
                {avatarInitial}
              </span>
              <span className="hidden sm:block text-sm font-medium">
                {firstName}
              </span>
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 min-w-[180px] rounded-lg border border-white/10 bg-zinc-900/95 backdrop-blur p-1 shadow-xl"
              >
                {/* Attendee: My Bookings + Logout */}
                {user.role === "attendee" && (
                  <button
                    className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-white/10"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/my-bookings");
                    }}
                  >
                    My Bookings
                  </button>
                )}

                {/* Admin/Organizer: only Logout (attendee also gets this) */}
                <button
                  className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-white/10"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile burger */}
      <MenuIcon
        className="max-md:ml-4 md:hidden w-8 h-8 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      />
    </div>
  );
};

export default Navbar;
