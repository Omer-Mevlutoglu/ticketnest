import React from "react";
import { ArrowRight, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import hLogo from "@/assets/images/hLogo.svg";

const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="hero-section bg-[url('/unsplash.jpg')] w-full h-screen bg-cover gap-4 px-6 md:px-16 lg:px-36 flex flex-col items-start justify-center">
      <img src={hLogo} alt="TicketNest" className="max-h-11 lg:h-11 mt-20" />
      <h1 className="text-5xl md:text-[70px] md:leading-18 max-w-110 font-semibold">
        Feel the <br /> Crowd
      </h1>

      <div className="content flex flex-wrap items-center gap-4 text-white">
        <span>Concert | Festival | Theater</span>
        <div className="flex items-center gap-1">
          <UsersIcon className="w-4.5 h-4.5" aria-hidden="true" />
          Live seat availability
        </div>
        <div className="flex items-center gap-1">
          <ShieldCheckIcon className="w-4.5 h-4.5" aria-hidden="true" />
          Safe portfolio demo
        </div>
      </div>

      <p className="max-w-md">
        Discover live events near you—from headline concerts to local shows.
        Pick exact seats, see live availability, and complete a simulated
        checkout in this full-stack portfolio demo.
      </p>

      <button
        type="button"
        className="flex items-center gap-1 bg-primary px-6 py-3 text-sm hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
        onClick={() => navigate("/events")}
      >
        Explore Events
        <ArrowRight className="w-5 h-5" aria-hidden="true" />
      </button>
    </div>
  );
};

export default HeroSection;
