import React from "react";
import { MailCheckIcon } from "lucide-react";
import { Link } from "react-router-dom";

const CheckEmailPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <MailCheckIcon className="w-16 h-16 text-primary mb-4" />
      <h1 className="text-2xl font-semibold mb-2">Check Your Email</h1>
      <p className="text-gray-400 max-w-md mb-6">
        We've sent a verification link to your email address. Please click the
        link in the email to activate your account.
      </p>
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
