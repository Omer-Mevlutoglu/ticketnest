import React from "react";
import { Link } from "react-router-dom";
import hLogo from "@/assets/images/hLogo.svg";

const SOURCE_URL = "https://github.com/Omer-Mevlutoglu/ticketnest";

const Footer: React.FC = () => {
  return (
    <footer className="px-6 md:px-16 lg:px-36 mt-40 w-full text-gray-300">
      <div className="flex flex-col md:flex-row justify-between w-full gap-10 border-b border-gray-500 pb-14">
        <div className="md:max-w-96">
          <Link to="/" aria-label="TicketNest home">
            <img alt="TicketNest" className="h-11" src={hLogo} />
          </Link>
          <p className="mt-6 text-sm leading-6">
            A full-stack event-booking portfolio project with role-based
            workflows, live seat inventory, atomic holds, and a simulated
            checkout.
          </p>
        </div>

        <div className="flex-1 flex items-start md:justify-end gap-20 md:gap-40">
          <div>
            <h2 className="font-semibold mb-5">Explore</h2>
            <ul className="text-sm space-y-2">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/events">Events</Link>
              </li>
              <li>
                <a href={SOURCE_URL} target="_blank" rel="noreferrer">
                  Source code
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold mb-5">Demo notes</h2>
            <p className="max-w-52 text-sm leading-6">
              Payments are simulated. Shared management actions are restricted
              so every visitor gets a reliable demo.
            </p>
          </div>
        </div>
      </div>

      <p className="pt-4 text-center text-sm pb-5">
        © {new Date().getFullYear()} TicketNest · Portfolio demonstration
      </p>
    </footer>
  );
};

export default Footer;
