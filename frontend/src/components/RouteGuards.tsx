import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import Loading from "./Loading";
import { useAuth } from "../../context/AuthContext";

export type Role = "attendee" | "organizer" | "admin";

// eslint-disable-next-line react-refresh/only-export-components
export const roleHomePath = (role: Role) => {
  switch (role) {
    case "organizer":
      // Send organizers to their dashboard, not the homepage
      return "/organizer";
    case "admin":
      return "/admin";
    default:
      return "/"; // Attendee homepage
  }
};

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  return <>{children}</>;
};

export const RequireRole: React.FC<{
  roles: Role[];
  children: React.ReactNode;
  requireApproval?: boolean; // <-- UPDATED: Added prop
}> = ({ roles, children, requireApproval = false }) => {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;

  // 1. Check if the user has one of the allowed roles
  if (!roles.includes(user.role as Role)) {
    return (
      <Navigate
        to={roleHomePath(user.role as Role)}
        replace
        state={{ from: loc }}
      />
    );
  }

  // 2. NEW: Check for organizer approval if required
  const organizerNotApproved =
    requireApproval && user.role === "organizer" && user.isApproved === false;

  if (organizerNotApproved) {
    // Redirect to the base organizer page, which should show a "Pending Approval" message
    return <Navigate to="/organizer" replace />;
  }

  // All checks passed
  return <>{children}</>;
};
