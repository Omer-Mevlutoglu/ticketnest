import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import BlurCircle from "../../components/BlurCircle";
import toast from "react-hot-toast";

const Register: React.FC = () => {
  const nav = useNavigate();
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"attendee" | "organizer">("attendee");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password)
      return toast.error("All fields are required");
    setBusy(true);
    try {
      await register({ username, email, password, role });
      nav("/check-email");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[100vh]">
      <BlurCircle top="40px" left="80px" />
      <h1 className="text-lg font-semibold mb-6">Create your account</h1>

      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        <div>
          <label className="text-sm text-gray-300">Username</label>
          <input
            className="w-full mt-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
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
          <p className="text-xs text-gray-400 mt-1">6+ characters.</p>
        </div>

        <div>
          <label className="text-sm text-gray-300">Role</label>
          <div className="mt-2 flex items-center gap-6">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={role === "attendee"}
                onChange={() => setRole("attendee")}
              />
              Attendee
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                checked={role === "organizer"}
                onChange={() => setRole("organizer")}
              />
              Organizer
            </label>
          </div>
          {role === "organizer" && (
            <p className="text-xs text-yellow-300/90 mt-2">
              Organizer accounts require admin approval before creating events.
            </p>
          )}
        </div>

        <button
          disabled={busy}
          className="px-4 py-2 rounded-md bg-primary hover:bg-primary-dull transition disabled:opacity-60"
        >
          {busy ? "Creating..." : "Create account"}
        </button>

        <p className="text-sm text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-primary">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
