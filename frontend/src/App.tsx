// src/App.tsx
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import { useAuth } from "../context/AuthContext";
import {
  RequireAuth,
  RequireRole,
  roleHomePath,
} from "./components/RouteGuards";

import Home from "./pages/Home"; // ⬅️ add this import
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import SeatMapPage from "./pages/SeatMapPage";
import MyBookings from "./pages/MyBookings";
import CheckoutPage from "./pages/CheckoutPage";
import OrganizerLayout from "./pages/organizer/layout/OrganizerLayout";
import AdminLayout from "./pages/admin/layout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Loading from "./components/Loading";
import Dashboard from "./pages/organizer/Dashboard";
import MyEventsPage from "./pages/organizer/MyEvents";
import CreateEventPage from "./pages/organizer/CreateEventPage";
import ManageEventPage from "./pages/organizer/ManageEventPage";
import OrganizerApprovals from "./pages/admin/OrganizerApprovals";
import VenueEditor from "./pages/admin/VenueEditor";
import VenuesList from "./pages/admin/VenuesList";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminUsers from "./pages/admin/AdminUsers";
import Favorites from "./pages/Favorites";

const App = () => {
  const pathname = useLocation().pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isOrganizerRoute = pathname.startsWith("/organizer");
  const { user, loading } = useAuth();

  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (loading && !isAuthPage) {
    return (
      <>
        <Toaster />
        <Loading />
      </>
    );
  }

  return (
    <>
      <Toaster />

      {/* Hide public navbar/footer inside admin & organizer shells */}
      {!isAdminRoute && !isOrganizerRoute && user && <Navbar />}

      <Routes>
        {/* ✅ Home is now attendees-only */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <RequireRole roles={["attendee"]}>
                <Home />
              </RequireRole>
            </RequireAuth>
          }
        />

        {/* ---------------- Attendee-only ---------------- */}
        <Route
          path="/events"
          element={
            <RequireAuth>
              <RequireRole roles={["attendee"]}>
                <Events />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="/favorite"
          element={
            <RequireAuth>
              <RequireRole roles={["attendee"]}>
                <Favorites />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="/events/:id"
          element={
            <RequireAuth>
              <RequireRole roles={["attendee"]}>
                <EventDetails />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="/events/:id/seatmap"
          element={
            <RequireAuth>
              <RequireRole roles={["attendee"]}>
                <SeatMapPage />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <RequireAuth>
              <RequireRole roles={["attendee"]}>
                <MyBookings />
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route
          path="/checkout/:id"
          element={
            <RequireAuth>
              <RequireRole roles={["attendee"]}>
                <CheckoutPage />
              </RequireRole>
            </RequireAuth>
          }
        />

        {/* ---------------- Organizer-only ---------------- */}
        <Route
          path="/organizer"
          element={
            <RequireAuth>
              <RequireRole roles={["organizer"]}>
                <OrganizerLayout />
              </RequireRole>
            </RequireAuth>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="myevents" element={<MyEventsPage />} />
          <Route path="events/new" element={<CreateEventPage />} />
          <Route path="events/:id/manage" element={<ManageEventPage />} />
        </Route>

        {/* ---------------- Admin-only ---------------- */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireRole roles={["admin"]}>
                <AdminLayout />
              </RequireRole>
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="requests" element={<OrganizerApprovals />} />
          <Route path="venue-list" element={<VenuesList />} />
          <Route path="venue-create" element={<VenueEditor />} />
          <Route path="list-bookings" element={<AdminBookings />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>

        {/* Auth pages */}
        <Route
          path="/login"
          element={
            user ? <Navigate to={roleHomePath(user.role)} replace /> : <Login />
          }
        />
        <Route
          path="/register"
          element={
            user ? (
              <Navigate to={roleHomePath(user.role)} replace />
            ) : (
              <Register />
            )
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isAdminRoute && !isOrganizerRoute && user && <Footer />}
    </>
  );
};

export default App;
