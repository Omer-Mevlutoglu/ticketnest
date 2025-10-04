// src/pages/auth/Login.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BlurCircle from "../../components/BlurCircle";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";
import { roleHomePath } from "../../components/RouteGuards";

const Login: React.FC = () => {
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // login() sets context.user with { id, email, role } from backend
      await login({ email, password });

      // Pull the role from localStorage snapshot (AuthContext saves it there)
      const raw = localStorage.getItem("cj_user");
      const role = raw
        ? (JSON.parse(raw).role as "attendee" | "organizer" | "admin")
        : "attendee";

      toast.success("Welcome back!");
      nav(roleHomePath(role), { replace: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[100vh]">
      <BlurCircle top="40px" left="80px" />
      <h1 className="text-lg font-semibold mb-6">Log in</h1>

      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        <div>
          <label className="text-sm text-gray-300">Email</label>
          <input
            type="email"
            className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-gray-300">Password</label>
          <input
            type="password"
            className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          disabled={busy}
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
