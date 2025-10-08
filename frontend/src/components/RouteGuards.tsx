// src/components/RouteGuards.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import Loading from "./Loading";
import { useAuth } from "../../context/AuthContext";

export type Role = "attendee" | "organizer" | "admin";

// eslint-disable-next-line react-refresh/only-export-components
export const roleHomePath = (role: Role) => {
  switch (role) {
    case "organizer":
      return "/organizer/myevents";
    case "admin":
      return "/admin";
    default:
      return "/"; 
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
}> = ({ roles, children }) => {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;

  if (!roles.includes(user.role as Role)) {
    return (
      <Navigate
        to={roleHomePath(user.role as Role)}
        replace
        state={{ from: loc }}
      />
    );
  }
  return <>{children}</>;
};
