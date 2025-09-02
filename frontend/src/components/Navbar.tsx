// src/components/layout/Navbar.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MenuIcon, Search, XIcon } from "lucide-react";

// mock favorites
const favoriteEvents = ["1", "2"];

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed top-0 left-0 z-50 w-full flex items-center justify-between px-6 md:px-16 lg:px-36 py-5">
      <Link to="/" className="max-md:flex-1">
        <img
          src="../../assets/images/logo.png"
          alt="Logo"
          className="w-36 h-auto"
        />
      </Link>

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
        <Link onClick={() => setIsOpen(false)} to="/theater">
          Theater
        </Link>
        <Link onClick={() => setIsOpen(false)} to="/releases">
          Releases
        </Link>
        {favoriteEvents.length > 0 && (
          <Link onClick={() => setIsOpen(false)} to="/favorite">
            Favorite
          </Link>
        )}
      </div>

      <div className="flex items-center gap-8">
        <Search className="w-6 h-6 max-md:hidden cursor-pointer" />
        <button
          onClick={() => navigate("/login")}
          className="px-4 py-1 sm:px-7 sm:py-2 bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
        >
          Login
        </button>
      </div>

      <MenuIcon
        className="max-md:ml-4 md:hidden w-8 h-8 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      />
    </div>
  );
};

export default Navbar;
