// src/components/home/HeroSection.tsx
import React from "react";
import { ArrowRight, Calendar1Icon, ClockIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="hero-section bg-[url('../../assets/images/unsplash.jpg')] w-full h-screen bg-cover gap-4 px-6 md:px-16 lg:px-36 flex flex-col items-start justify-center">
      {/* Logo placeholder */}
      <img
        src="../../assets/images/hLogo.svg"
        alt="Hero logo"
        className="mx-h-11 lg:h-11 mt-20"
      />
      <h1 className="text-5xl md:text-[70px] md:leading-18 max-w-110 font-semibold">
        Feel the <br /> Crowd
      </h1>

      <div className="content flex items-center gap-4 text-white">
        <span>Concert | Festival | Theater</span>
        <div className="flex items-center gap-1">
          <Calendar1Icon className="w-4.5 h-4.5" />
          Sep 2025
        </div>
        <div className="flex items-center gap-1">
          <ClockIcon className="w-4.5 h-4.5" />
          8:00 PM
        </div>
      </div>

      <p className="max-w-md">
        Discover live events near you—from headline concerts to local shows.
        Pick your seat, pay securely, and get instant e-tickets with CrowdJoy.
      </p>

      <button
        className="flex items-center gap-1 bg-primary px-6 py-3 text-sm hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
        onClick={() => navigate("/events")}
      >
        Explore Events
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default HeroSection;
