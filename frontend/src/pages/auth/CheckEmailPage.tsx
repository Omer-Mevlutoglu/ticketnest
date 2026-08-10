import React, { useState } from "react";
import { MailCheckIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { apiPost, errorMessage } from "@/lib/api";
import { useAppConfig } from "@/hooks/useAppConfig";

type CheckEmailState = {
  email?: string;
  verificationEmailSent?: boolean;
};

const CheckEmailPage: React.FC = () => {
  const location = useLocation();
  const state = (location.state ?? {}) as CheckEmailState;
  const { config } = useAppConfig();
  const [email, setEmail] = useState(state.email ?? "");
  const [sending, setSending] = useState(false);
  const initialDeliveryFailed = state.verificationEmailSent === false;

  const resend = async () => {
    if (!email.trim()) {
      toast.error("Enter the email address used during registration.");
      return;
    }

    setSending(true);
    try {
      await apiPost("/api/auth/resend-verification", { email });
      toast.success(
        "If that account is awaiting verification, a new link will be sent."
      );
    } catch (error) {
      toast.error(errorMessage(error, "Unable to request another link."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <MailCheckIcon className="w-16 h-16 text-primary mb-4" />
      <h1 className="text-2xl font-semibold mb-2">Check Your Email</h1>
      <p className="text-gray-400 max-w-md mb-6">
        {initialDeliveryFailed
          ? "Your account was created, but the first verification message could not be delivered. Request another link below."
          : "If delivery succeeded, a verification link is waiting in your inbox. Use it to activate your account."}
      </p>
      {config?.emailEnabled && (
        <div className="w-full max-w-md mb-6 space-y-3">
          <label htmlFor="verification-email" className="sr-only">
            Registration email
          </label>
          <input
            id="verification-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Registration email"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 outline-none"
          />
          <button
            type="button"
            disabled={sending}
            onClick={resend}
            className="px-4 py-2 rounded-md border border-primary text-primary hover:bg-primary/10 transition disabled:opacity-60"
          >
            {sending ? "Requesting..." : "Resend verification link"}
          </button>
        </div>
      )}
      <Link
        to="/login"
        className="px-4 py-2 rounded-md bg-primary hover:bg-primary-dull transition"
      >
        Back to Login
      </Link>
    </div>
  );
};

export default CheckEmailPage;
