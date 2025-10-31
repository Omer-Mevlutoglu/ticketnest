import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";
// Import an icon for the error message
import { AlertCircleIcon } from "lucide-react";
import BlurCircle from "../../components/BlurCircle";

const Login: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nav = useNavigate();
  const { login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // --- 1. ADD STATE TO HOLD THE FORM ERROR ---
  const [formError, setFormError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError(null); // --- 2. CLEAR PREVIOUS ERROR ---

    try {
      await login({ email, password });
      toast.success("Welcome back!");
      // Navigation is now handled by App.tsx, which is great.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const message = err?.message || "Login failed";
      // --- 3. SET THE ERROR MESSAGE IN STATE ---
      setFormError(message);
      toast.error(message); // This is optional
    } finally {
      setBusy(false);
    }
  };

  // Disable form if auth context is loading OR this form is submitting
  const isDisabled = loading || busy;

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[100vh]">
      <BlurCircle top="40px" left="80px" />
      <h1 className="text-lg font-semibold mb-6">Log in</h1>

      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        {/* --- 4. ADD THE ERROR MESSAGE COMPONENT --- */}
        {formError && (
          <div className="flex items-center gap-3 p-3 rounded-md border border-red-500/50 bg-red-500/10 text-red-300">
            <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{formError}</p>
          </div>
        )}
        {/* --- END OF NEW COMPONENT --- */}

        <div>
          <label className="text-sm text-gray-300">Email</label>
          <input
            type="email"
            className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isDisabled}
          />
        </div>
        <div>
          <label className="text-sm text-gray-300">Password</label>
          <input
            type="password"
            className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isDisabled}
          />
        </div>

        <button
          disabled={isDisabled}
          className="px-4 py-2 rounded-md bg-primary hover:bg-primary-dull transition disabled:opacity-60"
        >
          {busy ? "Logging in..." : "Log in"}
        </button>

        <p className="text-sm text-gray-400">
          New here?{" "}
          <Link to="/register" className="text-primary">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
