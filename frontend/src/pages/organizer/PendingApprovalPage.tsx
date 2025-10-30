import React, { useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext"; // Adjust path as needed
import toast from "react-hot-toast";
// *** ADD LogOutIcon IMPORT ***
import { LogOutIcon } from "lucide-react";

const PendingApprovalPage: React.FC = () => {
  // *** Get logout function from context ***
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  // Effect to redirect automatically if the user becomes approved
  useEffect(() => {
    if (!authLoading && user?.role === "organizer" && user.isApproved) {
      toast.success("Account approved! Redirecting...");
      const timer = setTimeout(() => {
        navigate("/organizer", { replace: true });
      }, 1000);
      return () => clearTimeout(timer);
    } else if (!authLoading && user && user.role !== "organizer") {
      navigate("/", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // *** ADD Logout Handler ***
  const handleLogout = async () => {
    try {
      await logout();
      // Navigate to login after logout is complete
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error("Logout failed.");
      console.error("Logout error:", err);
    }
  };
  // *** END Logout Handler ***

  // Show loader only during the initial auth check
  if (authLoading) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-primary" />
      </div>
    );
  }

  // --- Redirect Checks (after loading) ---
  if (user?.role === "organizer" && user.isApproved) {
    return <Navigate to="/organizer" replace />;
  }
  if (user && user.role !== "organizer") {
    return <Navigate to="/" replace />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // --- End Redirect Checks ---

  // --- Render Pending Message ---
  return (
    // Added flex-col to allow button spacing
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4 sm:p-6">
      <div className="max-w-md">
        <h1 className="text-xl sm:text-2xl font-semibold mb-2">
          Organizer Approval Pending
        </h1>
        <p className="text-sm sm:text-base text-gray-400 mb-6">
          {" "}
          {/* Reduced bottom margin */}
          Your organizer account is awaiting admin approval. Access to the
          organizer dashboard will be granted automatically once your account is
          reviewed and approved.
        </p>
        {/* Refresh button removed */}

        {/* *** ADD Logout Button *** */}
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 mt-4 rounded-md border border-white/20 hover:bg-white/10 transition text-sm sm:text-base text-gray-300" // Added styling
        >
          <LogOutIcon className="w-4 h-4" />
          Logout
        </button>
        {/* *** END Logout Button *** */}
      </div>
    </div>
  );
};

export default PendingApprovalPage;
