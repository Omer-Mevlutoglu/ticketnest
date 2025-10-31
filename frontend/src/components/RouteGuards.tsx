import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, type Role } from "../../context/AuthContext";
import Loading from "./Loading";

// eslint-disable-next-line react-refresh/only-export-components
export const roleHomePath = (role: Role | undefined) => {
  // Allow undefined
  switch (role) {
    case "organizer":
      // Default target for organizers (guards will handle pending redirect)
      return "/organizer";
    case "admin":
      return "/admin";
    case "attendee":
      return "/"; // Attendee home
    default:
      return "/login"; // Default if role is missing
  }
};

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <Loading />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  return <>{children}</>;
};

export const RequireRole: React.FC<{
  roles: Role[];
  children: React.ReactNode;
  requireApproval?: boolean;
}> = ({ roles, children, requireApproval = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Fallback checks (though RequireAuth should handle these)
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // 1. Check Role
  if (!roles.includes(user.role as Role)) {
    return (
      <Navigate
        to={roleHomePath(user.role as Role)}
        replace
        // state={{ from: location }} // Usually not needed for role mismatch
      />
    );
  }

  // 2. Check Organizer Approval
  const isOrganizer = user.role === "organizer";
  const needsApprovalCheck = requireApproval && isOrganizer;
  const isApproved = user.isApproved === true;

  if (needsApprovalCheck && !isApproved) {
    return <Navigate to="/organizer/pending" replace />;
  }

  return <>{children}</>;
};
