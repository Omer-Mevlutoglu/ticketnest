import { RequireAuth } from "./components/RouteGuards";
import Loading from "./components/Loading";

import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Home from "./pages/Home";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import { useAuth } from "../context/AuthContext";

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
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />

        {/* Public auth routes */}
        <Route
          path="/login"
          element={
            // optional: if already logged in, bounce to home
            user ? <Navigate to="/" replace /> : <Login />
          }
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
