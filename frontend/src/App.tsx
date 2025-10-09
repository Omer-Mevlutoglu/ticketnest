import { RequireAuth, RequireRole } from "./components/RouteGuards";
import Loading from "./components/Loading";

import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Home from "./pages/Home";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import { useAuth } from "../context/AuthContext";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import SeatMapPage from "./pages/SeatMapPage";
import MyBookings from "./pages/MyBookings";
import CheckoutPage from "./pages/CheckoutPage";

const App = () => {
  const pathname = useLocation().pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isOrganizerRoute = pathname.startsWith("/organizer");

  // NEW: read loading from context
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

      {!isAdminRoute && !isOrganizerRoute && user && <Navbar />}
      <Routes>
        {/* Home (protected for all logged-in users) */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />

        {/* ✅ Attendee-only routes */}
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
          path="/checkout/:id"
          element={
            <RequireAuth>
              <CheckoutPage />
            </RequireAuth>
          }
        />
        {/* Public auth routes */}
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

      {!isAdminRoute && !isOrganizerRoute && user && <Footer />}
    </>
  );
};

export default App;
