import React from "react";

const PendingApproval: React.FC = () => {
  return (
    <div className="min-h-[70vh] grid place-items-center text-center p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">
          Organizer approval pending
        </h1>
        <p className="text-gray-400 max-w-xl">
          Your organizer account is awaiting admin approval. You’ll get access
          to the organizer dashboard once approved.
        </p>
      </div>
    </div>
  );
};

export default PendingApproval;
