import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { RequireAuth, RequireRole } from "./components/RouteGuards";
import Loading from "./components/Loading";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import SeatMapPage from "./pages/SeatMapPage";
import MyBookings from "./pages/MyBookings";
import CheckoutPage from "./pages/CheckoutPage";
import PendingApproval from "./pages/organizer/PendingApproval";
import RequireOrganizerApproved from "./components/organizer/RequireOrganizerApproved";
import OrganizerLayout from "./pages/organizer/layout/OrganizerLayout";
import MyEvents from "./pages/organizer/MyEvents";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import CreateEvent from "./pages/organizer/CreateEventPage";
import EditEvent from "./pages/organizer/ManageEventPage";
import Dashboard from "./pages/organizer/Dashboard";

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

  const showPublicChrome =
    // show navbar/footer only for logged-in attendees on non-admin/non-organizer routes
    !!user && user.role === "attendee" && !isAdminRoute && !isOrganizerRoute;

  return (
    <>
      <Toaster />

      {showPublicChrome && <Navbar />}

      <Routes>
        {/* Attendee Home ONLY */}
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

        {/* ---------- Attendee-only area ---------- */}
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

        {/* ---------- Organizer area (unchanged) ---------- */}
        <Route path="/organizer/pending" element={<PendingApproval />} />
        <Route
          path="/organizer"
          element={
            <RequireOrganizerApproved>
              <OrganizerLayout />
            </RequireOrganizerApproved>
          }
        >
          {/* Default route now points to dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* Dashboard route */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="myevents" element={<MyEvents />} />
          <Route path="events/new" element={<CreateEvent />} />
          <Route path="events/:id" element={<EditEvent />} />
        </Route>

        {/* ---------- Auth (public) ---------- */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/" replace /> : <Register />}
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showPublicChrome && <Footer />}
    </>
  );
};

export default App;
