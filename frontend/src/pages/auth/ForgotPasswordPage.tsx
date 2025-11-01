/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { MailIcon } from "lucide-react";

const API_BASE =
  (import.meta as any).env.VITE_API_BASE || "http://localhost:5000";

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setMessage(data.message); // "If an account exists..."
      toast.success("Reset link sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-semibold mb-4">Forgot Your Password?</h1>
      <p className="text-gray-400 max-w-md text-center mb-6">
        No problem. Enter your email address below and we'll send you a link to
        reset it. Check your spam/junk folder if you don't see it in your inbox.
      </p>

      {message ? (
        <div className="text-emerald-300 bg-emerald-500/10 p-4 rounded-md text-center">
          <MailIcon className="w-12 h-12 mx-auto mb-2" />
          {message}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <label className="text-sm text-gray-300">Email</label>
            <input
              type="email"
              className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
            />
          </div>
          <button
            disabled={busy}
            className="w-full px-4 py-2 rounded-md bg-primary hover:bg-primary-dull transition disabled:opacity-60"
          >
            {busy ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}

      <p className="text-sm text-gray-400 mt-6">
        Remembered your password?{" "}
        <Link to="/login" className="text-primary">
          Log in
        </Link>
      </p>
    </div>
  );
};

export default ForgotPasswordPage;
