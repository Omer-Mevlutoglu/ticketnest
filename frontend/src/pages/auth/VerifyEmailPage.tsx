 
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2Icon, XCircleIcon, CheckCircle2Icon } from "lucide-react";
import { apiPost, errorMessage } from "@/lib/api";


type Status = "loading" | "success" | "error";

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No token provided. Please check your link.");
      return;
    }

    const verify = async () => {
      try {
        const data = await apiPost<{ message: string }>(
          "/api/auth/verify-email",
          { token }
        );

        setStatus("success");
        setMessage(data.message);

        // Redirect to login after 3 seconds
        setTimeout(() => navigate("/login"), 3000);
      } catch (err) {
        setStatus("error");
        setMessage(errorMessage(err, "An unknown error occurred."));
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      {status === "loading" && (
        <Loader2Icon className="w-16 h-16 text-primary mb-4 animate-spin" />
      )}
      {status === "success" && (
        <CheckCircle2Icon className="w-16 h-16 text-emerald-500 mb-4" />
      )}
      {status === "error" && (
        <XCircleIcon className="w-16 h-16 text-red-500 mb-4" />
      )}
      <h1 className="text-2xl font-semibold mb-2">
        {status === "loading"
          ? "Verifying..."
          : status === "success"
          ? "Success!"
          : "Error"}
      </h1>
      <p className="text-gray-400 max-w-md">{message}</p>
    </div>
  );
};

export default VerifyEmailPage;
