import { ArrowRight, Calendar1Icon, ClockIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <div className=" hero-section bg-[url('/cel.jpg')] w-full h-screen bg-cover gap-4 px-6 md:px-16 lg:px-36 flex flex-col items-start justify-center">
      <img src="/vite.svg" alt="" className="mx-h-11 lg:h-11 mt-20" />
      <h1 className="text-5xl md:text-[70px] md:leading-18 max-w-110 font-semibold ">
        Guardians <br /> of the Galaxy
      </h1>
      <div className="content flex items-center gap-4 text-white">
        <span>Action | Adventure | Sci-Fi</span>
        <div className="flex items-center gap-1">
          <Calendar1Icon className=" w-4.5 h-4.5" />
          2018
        </div>
        <div className="flex items-center gap-1">
          <ClockIcon className=" w-4.5 h-4.5" />
          2h 8m
        </div>
      </div>{" "}
      <p className="max-w-md">
        In a post-apocalyptic world where cities ride on wheels and consume each
        other to survive, two people meet in London and try to stop a
        conspiracy.
      </p>
      <button
        className="flex items-center gap-1 bg-primary px-6 py-3 text-sm hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
        onClick={() => navigate("/movies")}
      >
        Explore Movies
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default HeroSection;
