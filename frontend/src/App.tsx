// src/App.tsx
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Home from "./pages/Home";
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import SeatLayout from "./pages/SeatLayout";
import MyBookings from "./pages/MyBookings";
import Loading from "./pages/Loading";
import Favorite from "./pages/Favorite";
import DashBoard from "./pages/admin/DashBoard";
import VenueShow from "./pages/admin/VenueShow";
import ListEvents from "./pages/admin/ListEvents";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import AdminLayout from "./pages/admin/Layout";
import OrganizerApprovals from "./pages/admin/OrganizerApprovals";
import ListBookings from "./pages/admin/ListBookings";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import MyEvents from "./pages/organizer/MyEvents";
import EventCreate from "./pages/organizer/EventCreate";
import EventEdit from "./pages/organizer/EventEdit";
import SeatmapGenerate from "./pages/organizer/SeatmapGenerate";
import OrganizerLayout from "./pages/organizer/Layout";
import { RequireRole } from "./components/RouteGuards";

const App = () => {
  const pathname = useLocation().pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isOrganizerRoute = pathname.startsWith("/organizer");

  return (
    <>
      <Toaster />
      {/* Public navbar/footer are hidden inside admin & organizer shells */}
      {!isAdminRoute && !isOrganizerRoute && <Navbar />}

      <Routes>
        {/* public */}
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/events/:id/:date" element={<SeatLayout />} />
        <Route path="/loading/:nextUrl" element={<Loading />} />
        <Route path="/favorite" element={<Favorite />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* attendee-only */}
        <Route
          path="/my-bookings"
          element={
            <RequireRole roles={["attendee"]}>
              <MyBookings />
            </RequireRole>
          }
        />

        {/* organizer-only layout & routes */}
        <Route
          path="/organizer"
          element={
            <RequireRole roles={["organizer"]}>
              <OrganizerLayout />
            </RequireRole>
          }
        >
          <Route index element={<Navigate to="myevents" replace />} />
          <Route path="myevents" element={<MyEvents />} />
          <Route path="events/new" element={<EventCreate />} />
          <Route path="events/:id/edit" element={<EventEdit />} />
          <Route path="events/:id/seatmap" element={<SeatmapGenerate />} />
        </Route>

        {/* admin-only layout & routes */}
        <Route
          path="/admin"
          element={
            <RequireRole roles={["admin"]}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<DashBoard />} />
          <Route path="add-venue" element={<VenueShow />} />
          <Route path="list-events" element={<ListEvents />} />
          <Route path="list-bookings" element={<ListBookings />} />
          <Route path="requests" element={<OrganizerApprovals />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isAdminRoute && !isOrganizerRoute && <Footer />}
    </>
  );
};

export default App;
