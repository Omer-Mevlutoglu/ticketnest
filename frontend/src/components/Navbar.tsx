/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MenuIcon, Search, XIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import logoSrc from "../../assets/images/logo.png";
const favoriteEvents = ["1", "2"];

function deriveFirstName(user: { email?: string } & Record<string, any>) {
  const username = (user as any)?.username as string | undefined;
  const base = username ?? (user.email ? user.email.split("@")[0] : "User");
  const first = base.split(/[.\-_ ]+/)[0] || base;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

const Navbar: React.FC = () => {
  // same logic/state
  const [isOpen, setIsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const firstName = user ? deriveFirstName(user) : null;
  const avatarInitial = firstName ? firstName[0].toUpperCase() : "U";

  // close dropdown on outside click — unchanged
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  // scroll background toggle — unchanged
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate("/login");
  };

  return (
    <div
      className={`fixed top-0 left-0 z-50 w-full transition-colors duration-300 ${
        scrolled
          ? "bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/70 border-b border-white/10"
          : "bg-transparent"
      }`}
    >
      {/* Accent bottom border for style */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
        {/* Bar */}
        <div className="h-22 flex items-center justify-between">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src={logoSrc} alt="Logo" className="w-28 h-auto" />
          </Link>

          {/* Center: Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="relative inline-block text-md font-medium hover:opacity-90 transition"
            >
              Home
              <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-white/70 transition-all duration-200 hover:w-full" />
            </Link>
            <Link
              to="/events"
              className="relative inline-block text-md font-medium hover:opacity-90 transition"
            >
              Events
              <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-white/70 transition-all duration-200 hover:w-full" />
            </Link>

            {favoriteEvents.length > 0 && (
              <Link
                to="/favorite"
                className="relative inline-block text-md font-medium hover:opacity-90 transition"
              >
                Favorite
                <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-white/70 transition-all duration-200 hover:w-full" />
              </Link>
            )}
          </nav>

          {/* Right: Search + Auth */}
          <div className="flex items-center gap-4">
            <Search className="w-5 h-5 max-md:hidden cursor-pointer" />

            {!user ? (
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center rounded-full text-sm font-medium px-4 py-1.5 bg-primary hover:bg-primary-dull transition"
              >
                Login
              </button>
            ) : (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  title={firstName || "Account"}
                >
                  <span className="w-8 h-8 rounded-full bg-primary text-white grid place-items-center font-semibold text-sm">
                    {avatarInitial}
                  </span>
                  <span className="hidden sm:block text-sm font-medium">
                    {firstName}
                  </span>
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 min-w-[200px] rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur p-2 shadow-2xl"
                  >
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

            {/* Mobile burger */}
            <MenuIcon
              className="md:hidden w-7 h-7 cursor-pointer"
              onClick={() => setIsOpen((v) => !v)}
            />
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed top-0 right-0 h-screen w-80 z-50 transform transition-transform duration-300 bg-zinc-950/95 backdrop-blur border-l border-white/10
        ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/10">
          <span className="text-sm font-medium opacity-80">Menu</span>
          <XIcon
            className="w-6 h-6 cursor-pointer"
            onClick={() => setIsOpen(false)}
          />
        </div>

        <nav className="flex flex-col gap-1 p-3">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="px-3 py-2 rounded-md hover:bg-white/10"
          >
            Home
          </Link>
          <Link
            to="/events"
            onClick={() => setIsOpen(false)}
            className="px-3 py-2 rounded-md hover:bg-white/10"
          >
            Events
          </Link>
          {favoriteEvents.length > 0 && (
            <Link
              to="/favorite"
              onClick={() => (setIsOpen(false), scrollTo(0, 0))}
              className="px-3 py-2 rounded-md hover:bg-white/10"
            >
              Favorite
            </Link>
          )}

          <div className="mt-2 border-t border-white/10 pt-2">
            {!user ? (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate("/login");
                }}
                className="w-full text-left px-3 py-2 rounded-md bg-primary hover:bg-primary-dull font-medium"
              >
                Login
              </button>
            ) : (
              <>
                {user.role === "attendee" && (
                  <button
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-white/10"
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/my-bookings");
                    }}
                  >
                    My Bookings
                  </button>
                )}
                <button
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-white/10"
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Navbar;
