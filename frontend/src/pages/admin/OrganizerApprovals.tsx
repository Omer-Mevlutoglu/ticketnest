// src/admin/pages/OrganizerApprovals.tsx
import React from "react";
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";
import { useApprovalRequests } from "./hooks/useApprovalRequests";

const OrganizerApprovals: React.FC = () => {
  const { data, loading, error, pendingCount, approve, reject, busyId } =
    useApprovalRequests();

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="min-h-[70vh] grid place-items-center text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative px-6 md:px-10 lg:px-12 pt-8 md:pt-10">
      <BlurCircle top="-60px" left="-60px" />
      <BlurCircle top="100px" right="0px" />

      <div className="flex items-baseline justify-between mb-6">
        <h1 className="text-xl font-semibold">Organizer Approval Requests</h1>
        <span className="text-sm text-gray-400">
          Pending:{" "}
          <span className="text-primary font-medium">{pendingCount}</span>
        </span>
      </div>

      {data.length === 0 ? (
        <div className="text-gray-400">No pending requests 🎉</div>
      ) : (
        <div className="grid gap-3 max-w-4xl">
          {data.map((row) => {
            const org = row.organizerId;
            const isBusy = busyId === org._id;
            return (
              <div
                key={row._id}
                className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3"
              >
                <div className="flex items-center gap-3">
                  {/* Initial bubble */}
                  <span className="w-9 h-9 rounded-full bg-primary text-white grid place-items-center font-semibold">
                    {(org.username || org.email || "U").charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium">
                      {org.username ?? org.email?.split("@")[0] ?? "Organizer"}
                    </p>
                    <p className="text-xs text-gray-400">{org.email}</p>
                    <p className="text-xs text-gray-400">
                      Role: <span className="text-gray-300">{org.role}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 md:mt-0 flex items-center gap-2">
                  <button
                    disabled={isBusy}
                    onClick={() => approve(org._id)}
                    className="px-3 py-1.5 text-sm rounded-md bg-emerald-600/90 hover:bg-emerald-600 transition disabled:opacity-60"
                  >
                    {isBusy ? "Approving..." : "Approve"}
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => reject(org._id)}
                    className="px-3 py-1.5 text-sm rounded-md bg-rose-600/90 hover:bg-rose-600 transition disabled:opacity-60"
                  >
                    {isBusy ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrganizerApprovals;
