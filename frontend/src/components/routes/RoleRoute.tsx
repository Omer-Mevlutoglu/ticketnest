// src/components/routes/RoleRoute.tsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

type Role = "attendee" | "organizer" | "admin";

type Props = {
  allow: Role[];
  requireApprovedForOrganizer?: boolean;
  redirectTo?: string;
};

const homeFor = (role?: Role) => {
  switch (role) {
    case "admin":
      return "/admin";
    case "organizer":
      return "/organizer";
    default:
      return "/";
  }
};

const RoleRoute: React.FC<Props> = ({
  allow,
  requireApprovedForOrganizer = true,
  redirectTo = "/login",
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  // 👇 tolerate missing isApproved; only block if it's explicitly false
  const organizerNotApproved =
    requireApprovedForOrganizer &&
    user.role === "organizer" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (user as any).isApproved === false;

  if (organizerNotApproved) {
    return <Navigate to="/organizer" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
