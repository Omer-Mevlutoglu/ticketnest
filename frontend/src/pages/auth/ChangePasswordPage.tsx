import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { errorMessage } from "@/lib/api";
import BlurCircle from "@/components/BlurCircle";

const ChangePasswordPage = () => {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (newPassword.length < 12) {
      return setError("The new password must be at least 12 characters.");
    }
    if (newPassword !== confirmPassword) {
      return setError("The new passwords do not match.");
    }

    setBusy(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success("Password changed. Sign in again.");
      navigate("/login", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught, "Failed to change password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen px-6 pt-28 md:px-16 lg:px-40">
      <BlurCircle top="40px" left="80px" />
      <div className="max-w-md">
        <h1 className="text-xl font-semibold">Change your password</h1>
        <p className="mt-2 text-sm text-gray-400">
          {user?.mustChangePassword
            ? "Replace the temporary administrator password before opening the admin area."
            : "Choose a new password for your account."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
          <label className="block text-sm text-gray-300">
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={busy}
              required
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm text-gray-300">
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              disabled={busy}
              minLength={12}
              required
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="block text-sm text-gray-300">
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={busy}
              minLength={12}
              required
              className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-4 py-2 font-medium transition hover:bg-primary-dull disabled:opacity-60"
          >
            {busy ? "Changing password..." : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
