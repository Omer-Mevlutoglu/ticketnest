import { Route, Routes, useLocation } from "react-router-dom";
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
import Layout from "./pages/admin/Layout";
import OrganizerApprovals from "./pages/admin/OrganizerApprovals";
import ListBookings from "./pages/admin/ListBookings";

const App = () => {
  const isAdminRoute = useLocation().pathname.startsWith("/admin");
  const user = true;
  return (
    <>
      <Toaster />
      {!isAdminRoute && <Navbar />}

      <Routes>
        {/* public */}
        <Route path="/" element={<Home />} />
        <Route path="/movies" element={<Events />} />
        <Route path="/movies/:id" element={<EventDetails />} />
        <Route path="/movies/:id/:date" element={<SeatLayout />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/loading/:nextUrl" element={<Loading />} />
        <Route path="/favorite" element={<Favorite />} />

        {/* admin */}
        <Route
          path="/admin"
          element={
            user ? (
              <Layout />
            ) : (
              <div className="min-h-screen flex items-center justify-center">
                <p>SSSS</p>
              </div>
            )
          }
        >
          <Route index element={<DashBoard />} />
          <Route path="add-venue" element={<VenueShow />} />
          <Route path="list-events" element={<ListEvents />} />
          <Route path="list-bookings" element={<ListBookings />} />
          <Route path="requests" element={<OrganizerApprovals />} />
        </Route>
      </Routes>
      {!isAdminRoute && <Footer />}
    </>
  );
};

export default App;
