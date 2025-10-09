import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import Loading from "../../components/Loading";
import { useAuth } from "../../../context/AuthContext";

const RequireOrganizerApproved: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <Loading />;

  // must be organizer
  if (!user || user.role !== "organizer") {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  // not approved → show pending page
  if (!user.isApproved) {
    return <Navigate to="/organizer/pending" replace />;
  }

  return <>{children}</>;
};

export default RequireOrganizerApproved;
