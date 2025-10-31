/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertCircleIcon } from "lucide-react";

const API_BASE =
  (import.meta as any).env.VITE_API_BASE || "http://localhost:5000";

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      return setError("No reset token found. Please check your link.");
    }
    if (password.length < 6) {
      return setError("Password must be at least 6 characters long.");
    }
    if (password !== confirm) {
      return setError("Passwords do not match.");
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      toast.success(data.message);
      setTimeout(() => navigate("/login"), 2000); // Redirect after 2s
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <AlertCircleIcon className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Invalid Link</h1>
        <p className="text-gray-400">No password reset token was found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-semibold mb-6">Set a New Password</h1>

      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        {error && (
          <div className="flex items-center gap-3 p-3 rounded-md border border-red-500/50 bg-red-500/10 text-red-300">
            <AlertCircleIcon className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="text-sm text-gray-300">New Password</label>
          <input
            type="password"
            className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            required
          />
        </div>
        <div>
          <label className="text-sm text-gray-300">Confirm New Password</label>
          <input
            type="password"
            className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={busy}
            required
          />
        </div>
        <button
          disabled={busy}
          className="w-full px-4 py-2 rounded-md bg-primary hover:bg-primary-dull transition disabled:opacity-60"
        >
          {busy ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
