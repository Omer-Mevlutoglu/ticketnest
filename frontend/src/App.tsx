import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import { useAuth, type Role } from "@/context/AuthContext";
import {
  RequireAuth,
  RequirePasswordChangeComplete,
  RequireRole,
  roleHomePath,
} from "./components/RouteGuards";

// --- Page Imports ---
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import SeatMapPage from "./pages/SeatMapPage";
import MyBookings from "./pages/MyBookings";
import CheckoutPage from "./pages/CheckoutPage";
import Favorites from "./pages/Favorites";
// Organizer
import OrganizerLayout from "./pages/organizer/layout/OrganizerLayout";
import Dashboard from "./pages/organizer/Dashboard";
import CreateEventPage from "./pages/organizer/CreateEventPage";
import ManageEventPage from "./pages/organizer/ManageEventPage";
import PendingApprovalPage from "./pages/organizer/PendingApprovalPage";
// Admin
import AdminLayout from "./pages/admin/layout/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import OrganizerApprovals from "./pages/admin/OrganizerApprovals";
import VenueEditor from "./pages/admin/VenueEditor";
import VenuesList from "./pages/admin/VenuesList";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminUsers from "./pages/admin/AdminUsers";
import Loading from "./components/Loading";
import MyEventsPage from "./pages/organizer/MyEvents";
import CheckEmailPage from "./pages/auth/CheckEmailPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import ChangePasswordPage from "./pages/auth/ChangePasswordPage";
import {
  DemoAccessDialog,
  DemoProtectedPage,
} from "./components/DemoModeNotice";
// Common

/**
 * Where to send someone who has just signed in.
 *
 * `RequireAuth` stores the page they were trying to reach in location state, so
 * a visitor who clicked through to a seat map lands back on that seat map
 * rather than on a generic home page.
 */
const AfterAuthRedirect: React.FC<{ role: Role }> = ({ role }) => {
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from;
  const returnPath = from?.pathname;

  // Changing a password destroys the server session and clears the local user.
  // During that transition RequireAuth can remember /change-password as the
  // page to resume after login. Returning there creates a false rotation loop
  // even though the backend has already cleared mustChangePassword.
  const destination =
    returnPath && returnPath !== "/change-password"
      ? returnPath
      : roleHomePath(role);

  return <Navigate to={destination} replace />;
};

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
      <DemoAccessDialog />

      {/* Chrome renders for anonymous visitors too — otherwise the public
          pages have no navigation and no way to sign in. */}
      {!isAdminRoute && !isOrganizerRoute && <Navbar />}

      <Routes>
        {/* === Public browsing === */}
        {/* Anyone can discover events. Authentication is required from seat
            selection onwards, which is the first action that holds inventory. */}
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />

        {/* === Attendee Routes === */}
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

        {/* === Organizer Routes === */}
        {/* --- PENDING ROUTE - SIMPLIFIED GUARD --- */}
        <Route
          path="/organizer/pending"
          element={
            // Only require authentication
            <RequireAuth>
              <PendingApprovalPage />
            </RequireAuth>
          }
        />
        {/* --- END PENDING ROUTE --- */}

        <Route
          path="/organizer"
          element={
            <RequireAuth>
              {/* This guard redirects unapproved to /organizer/pending */}
              <RequireRole roles={["organizer"]} requireApproval={true}>
                <OrganizerLayout />
              </RequireRole>
            </RequireAuth>
          }
        >
          {/* Index route for approved organizers */}
          <Route index element={<Dashboard />} />
          <Route path="myevents" element={<MyEventsPage />} />
          <Route
            path="events/new"
            element={
              user?.canPerformProtectedWrites === false ? (
                <DemoProtectedPage />
              ) : (
                <CreateEventPage />
              )
            }
          />
          <Route path="events/:id/manage" element={<ManageEventPage />} />
          <Route
            path="events/:id/seatmap-preview"
            element={<SeatMapPage mode="organizer-preview" />}
          />
          <Route path="*" element={<Navigate to="/organizer" replace />} />
        </Route>

        {/* === Admin Routes === */}
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireRole roles={["admin"]}>
                <RequirePasswordChangeComplete>
                  <AdminLayout />
                </RequirePasswordChangeComplete>
              </RequireRole>
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="requests" element={<OrganizerApprovals />} />
          <Route path="venue-list" element={<VenuesList />} />
          <Route
            path="venue-create"
            element={
              user?.canPerformProtectedWrites === false ? (
                <DemoProtectedPage />
              ) : (
                <VenueEditor />
              )
            }
          />
          <Route
            path="venue-edit/:id"
            element={
              user?.canPerformProtectedWrites === false ? (
                <DemoProtectedPage />
              ) : (
                <VenueEditor />
              )
            }
          />
          <Route path="list-bookings" element={<AdminBookings />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>

        {/* === Auth Pages === */}
        <Route
          path="/login"
          element={
            user ? <AfterAuthRedirect role={user.role} /> : <Login />
          }
        />
        <Route
          path="/register"
          element={
            user ? <AfterAuthRedirect role={user.role} /> : <Register />
          }
        />

        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/change-password"
          element={
            <RequireAuth>
              <ChangePasswordPage />
            </RequireAuth>
          }
        />
        {/* === Global Fallback === */}
        {/* An unknown path sends anonymous visitors to the public home page,
            not to a login form. */}
        <Route
          path="*"
          element={
            <Navigate to={user ? roleHomePath(user.role) : "/"} replace />
          }
        />
      </Routes>

      {!isAdminRoute && !isOrganizerRoute && <Footer />}
    </>
  );
};

export default App;
