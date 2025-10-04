// src/App.tsx
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
  const { user } = useAuth();
  return (
    <>
      <Toaster />
      {/* Public navbar/footer are hidden inside admin & organizer shells */}
      {!isAdminRoute && !isOrganizerRoute && user && <Navbar />}

      <Routes>
        {/* public */}
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* attendee-only */}

        {/* admin-only layout & routes */}

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isAdminRoute && !isOrganizerRoute && user && <Footer />}
    </>
  );
};

export default App;
