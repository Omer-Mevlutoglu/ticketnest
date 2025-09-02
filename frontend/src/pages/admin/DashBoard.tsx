// src/pages/admin/Dashboard.tsx
import React, { useEffect, useState } from "react";
import {
  ChartLineIcon,
  CircleDollarSignIcon,
  PlayCircleIcon,
  UsersIcon,
  StarIcon,
} from "lucide-react";
import Loading from "../../components/Loading";
import Title from "../../components/admin/Title";
import BlurCircle from "../../components/BlurCircle";

type ActiveEvent = {
  _id: string;
  title: string;
  poster?: string;
  price: number;
  rating: number;
  dateTime: string; // ISO
};

type DashboardData = {
  totalBookings: number;
  totalRevenue: number;
  activeEvents: ActiveEvent[];
  totalUsers: number;
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const MOCK_DASHBOARD: DashboardData = {
  totalBookings: 238,
  totalRevenue: 12450,
  totalUsers: 913,
  activeEvents: [
    {
      _id: "e1",
      title: "The Silent Horizon – Premiere",
      poster: "",
      price: 18,
      rating: 8.4,
      dateTime: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      _id: "e2",
      title: "Crimson Alley – Evening Show",
      poster: "",
      price: 15,
      rating: 7.6,
      dateTime: new Date(Date.now() + 2 * 86400000).toISOString(),
    },
    {
      _id: "e3",
      title: "Paper Skies – Matinee",
      poster: "",
      price: 12,
      rating: 8.1,
      dateTime: new Date(Date.now() + 3 * 86400000).toISOString(),
    },
  ],
};

const currency = "USD ";

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashBoardData, setDashBoardData] = useState<DashboardData>({
    totalBookings: 0,
    totalRevenue: 0,
    activeEvents: [],
    totalUsers: 0,
  });

  useEffect(() => {
    // simulate fetch
    const t = setTimeout(() => {
      setDashBoardData(MOCK_DASHBOARD);
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const dashboardCards = [
    {
      title: "Total Bookings",
      value: String(dashBoardData.totalBookings),
      icon: ChartLineIcon,
    },
    {
      title: "Total Revenue",
      value: currency + dashBoardData.totalRevenue,
      icon: CircleDollarSignIcon,
    },
    {
      title: "Active Events",
      value: String(dashBoardData.activeEvents.length),
      icon: PlayCircleIcon,
    },
    {
      title: "Total Users",
      value: String(dashBoardData.totalUsers),
      icon: UsersIcon,
    },
  ];

  return !loading ? (
    <>
      <Title text1="Admin" text2="Dashboard" />
      <div className="flex flex-wrap relative gap-4 mt-6">
        <BlurCircle top="-100px" left="0" />
        <div className="flex flex-wrap gap-4 w-full">
          {dashboardCards.map(({ title, value, icon: Icon }, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-3 bg-primary/10 border border-primary/20 rounded-md max-w-50 w-full"
            >
              <div>
                <h1 className="text-sm">{title}</h1>
                <p className="text-xl font-medium mt-1">{value}</p>
              </div>
              <Icon className="w-6 h-6" />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xl font-medium mt-10">Active Events</p>
      <div className="relative flex flex-wrap gap-6 mt-4 max-w-5xl">
        <BlurCircle top="100px" left="-10%" />
        {dashBoardData.activeEvents.map((ev) => (
          <div
            key={ev._id}
            className="w-55 rounded-lg h-full pb-3 bg-primary/10 border border-primary/20 hover:-translate-y-1 transition-transform duration-300"
          >
            <img
              src={ev.poster || ""}
              alt={`${ev.title} poster`}
              className="h-60 w-full object-cover"
            />
            <p className="truncate font-medium p-2">{ev.title}</p>
            <div className="flex items-center justify-between px-2">
              <p className="text-lg font-medium">
                {currency}
                {ev.price}
              </p>
              <p className="flex items-center gap-1 text-sm text-gray-400 mt-1 pr-1">
                <StarIcon className="w-4 h-4 text-primary fill-primary" />
                {ev.rating.toFixed(1)}
              </p>
            </div>
            <div className="text-gray-500 px-2 pt-2 text-sm ">
              {formatDateTime(ev.dateTime)}
            </div>
          </div>
        ))}
      </div>
    </>
  ) : (
    <Loading />
  );
};

export default Dashboard;
