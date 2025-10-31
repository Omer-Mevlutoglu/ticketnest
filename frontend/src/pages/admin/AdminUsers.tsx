/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

import { useAdminUsers, type Role } from "./hooks/useAdminUsers";
import { useAuth } from "../../../context/AuthContext"; // <-- 1. IMPORT useAuth
import { CheckIcon, XIcon, UserCheckIcon, UserXIcon } from "lucide-react"; // <-- 2. IMPORT ICONS
import Loading from "../../components/Loading";
import BlurCircle from "../../components/BlurCircle";

// --- Helper Components (Unchanged) ---
function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    admin: "border-sky-400 text-sky-300",
    organizer: "border-violet-400 text-violet-300",
    attendee: "border-emerald-400 text-emerald-300",
  };
  return (
    <span
      className={`text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full border whitespace-nowrap ${map[role]}`}
    >
      {role}
    </span>
  );
}

function ApprovalBadge({ ok }: { ok?: boolean }) {
  if (ok === undefined) return null;
  return ok ? (
    <span className="text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-400 text-emerald-300 whitespace-nowrap">
      Approved
    </span>
  ) : (
    <span className="text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full border border-yellow-400 text-yellow-300 whitespace-nowrap">
      Pending
    </span>
  );
}
// --- End Helper Components ---

const AdminUsers: React.FC = () => {
  const { user: adminUser } = useAuth(); // <-- 3. Get current admin user
  const {
    loading,
    error,
    users,
    query,
    setQuery,
    role,
    setRole,
    refetch,
    busyId, // <-- 4. Get new state and functions
    setApprovalStatus,
    toggleSuspension,
  } = useAdminUsers();

  if (loading) return <Loading />;

  // --- 5. NEW: Helper button component ---
  const ActionButton: React.FC<{
    onClick: () => void;
    disabled: boolean;
    children: React.ReactNode;
    className: string;
    title: string;
  }> = ({ onClick, disabled, children, className, title }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-1 px-2 py-1 text-[10px] sm:text-xs rounded border transition disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );

  return (
    <div className="relative px-2 py-4 sm:px-6 md:px-10 lg:px-16 overflow-x-hidden">
      <BlurCircle top="0" right="-100px" />

      {/* Header (already responsive, unchanged) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <h1 className="text-base xs:text-lg sm:text-xl font-semibold w-full sm:w-auto">
          Users
        </h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email / username / id…"
            className="rounded-md bg-black/30 border border-white/15 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm w-full sm:w-auto md:w-[220px]"
          />
          <select
            className="rounded-md bg-black/30 border border-white/15 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm w-full sm:w-auto"
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option value="all">All roles</option>
            <option value="attendee">Attendee</option>
            <option value="organizer">Organizer</option>
            <option value="admin">Admin (self)</option>
          </select>
          <button
            onClick={refetch}
            className="px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md border border-white/15 hover:bg-white/10 transition w-full sm:w-auto"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {users.length === 0 ? (
        <p className="mt-8 text-gray-400 text-sm sm:text-base">
          No users match your filter.
        </p>
      ) : (
        <>
          {/* === 1. TABLE (Large Screens Only) === */}
          <div className="hidden lg:block mt-4 sm:mt-6 overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm border border-white/10 rounded-lg overflow-hidden">
              <thead className="bg-white/5">
                <tr className="[&>th]:text-left [&>th]:px-3 [&>th]:sm:px-4 [&>th]:py-2">
                  <th>User</th>
                  <th>Role</th>
                  <th>Organizer status</th>
                  <th>User ID</th>
                  <th>Created</th>
                  <th className="!text-center">Actions</th>{" "}
                  {/* <-- 6. ADD ACTIONS HEADER */}
                </tr>
              </thead>
              <tbody className="[&>tr]:border-b [&>tr]:border-white/10">
                {users.map((u) => {
                  const created = u.createdAt
                    ? new Date(u.createdAt).toLocaleString()
                    : "—";
                  const label = u.username || u.email || u._id;
                  const isSelf = u._id === adminUser?.id; // Check if it's the current admin
                  const isBusy = busyId === u._id;

                  return (
                    // <-- 7. ADD SUSPENDED STYLING -->
                    <tr
                      key={u._id}
                      className={`[&>td]:px-3 [&>td]:sm:px-4 [&>td]:py-2 align-top ${
                        u.isSuspended ? "opacity-40 bg-red-900/10" : ""
                      }`}
                    >
                      <td>
                        <div className="font-medium text-xs sm:text-sm truncate max-w-xs">
                          {label}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-400 truncate max-w-xs">
                          {u.email}
                        </div>
                        {u.isSuspended && (
                          <span className="text-xs text-red-400 font-medium">
                            SUSPENDED
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="whitespace-nowrap">
                        {u.role === "organizer" ? (
                          <ApprovalBadge ok={u.isApproved} />
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="text-[10px] sm:text-xs text-gray-400 max-w-[100px] truncate">
                        {u._id}
                      </td>
                      <td className="whitespace-nowrap text-xs">{created}</td>

                      {/* <-- 8. ADD ACTIONS CELL --> */}
                      <td className="whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isSelf ? (
                            <span className="text-xs text-gray-500">
                              (Current User)
                            </span>
                          ) : (
                            <>
                              {/* --- Organizer Actions --- */}
                              {u.role === "organizer" && (
                                <>
                                  {u.isApproved ? (
                                    <ActionButton
                                      onClick={() =>
                                        setApprovalStatus(u._id, false)
                                      }
                                      disabled={isBusy}
                                      title="Revoke Approval"
                                      className="border-yellow-400/50 text-yellow-300 hover:bg-yellow-500/10"
                                    >
                                      <UserXIcon className="w-3.5 h-3.5" />{" "}
                                      Revoke
                                    </ActionButton>
                                  ) : (
                                    <ActionButton
                                      onClick={() =>
                                        setApprovalStatus(u._id, true)
                                      }
                                      disabled={isBusy}
                                      title="Approve Organizer"
                                      className="border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/10"
                                    >
                                      <UserCheckIcon className="w-3.5 h-3.5" />{" "}
                                      Approve
                                    </ActionButton>
                                  )}
                                </>
                              )}
                              {/* --- Suspend Actions --- */}
                              {u.isSuspended ? (
                                <ActionButton
                                  onClick={() => toggleSuspension(u._id, false)}
                                  disabled={isBusy}
                                  title="Unsuspend User"
                                  className="border-green-400/50 text-green-300 hover:bg-green-500/10"
                                >
                                  <CheckIcon className="w-3.5 h-3.5" />{" "}
                                  Unsuspend
                                </ActionButton>
                              ) : (
                                <ActionButton
                                  onClick={() => toggleSuspension(u._id, true)}
                                  disabled={isBusy}
                                  title="Suspend User"
                                  className="border-red-400/50 text-red-300 hover:bg-red-500/10"
                                >
                                  <XIcon className="w-3.5 h-3.5" /> Suspend
                                </ActionButton>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* === 2. STACKED CARDS (Small/Medium Screens) === */}
          <div className="lg:hidden mt-4 sm:mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {users.map((u) => {
              const created = u.createdAt
                ? new Date(u.createdAt).toLocaleDateString()
                : "—";
              const label = u.username || u.email || u._id;
              const isSelf = u._id === adminUser?.id;
              const isBusy = busyId === u._id;

              return (
                <div
                  key={u._id}
                  // <-- 9. ADD SUSPENDED STYLING -->
                  className={`rounded-xl border border-white/10 bg-white/5 backdrop-blur p-3 ${
                    u.isSuspended ? "opacity-40 bg-red-900/10" : ""
                  }`}
                >
                  {/* Top section: User and Role */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {label}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {u.email}
                      </p>
                      {u.isSuspended && (
                        <span className="text-xs text-red-400 font-medium">
                          SUSPENDED
                        </span>
                      )}
                    </div>
                    <RoleBadge role={u.role} />
                  </div>

                  {/* Middle section: Status and Date */}
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-400">
                      Created: <span className="text-gray-200">{created}</span>
                    </div>
                    {u.role === "organizer" && (
                      <ApprovalBadge ok={u.isApproved} />
                    )}
                  </div>

                  {/* <-- 10. ADD ACTIONS SECTION --> */}
                  {!isSelf && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-1.5 sm:gap-2">
                      {/* --- Organizer Actions --- */}
                      {u.role === "organizer" && (
                        <>
                          {u.isApproved ? (
                            <ActionButton
                              onClick={() => setApprovalStatus(u._id, false)}
                              disabled={isBusy}
                              title="Revoke Approval"
                              className="border-yellow-400/50 text-yellow-300 hover:bg-yellow-500/10 flex-1" // flex-1 to fill space
                            >
                              <UserXIcon className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Revoke</span>
                              <span className="sm:hidden">Revoke</span>
                            </ActionButton>
                          ) : (
                            <ActionButton
                              onClick={() => setApprovalStatus(u._id, true)}
                              disabled={isBusy}
                              title="Approve Organizer"
                              className="border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/10 flex-1"
                            >
                              <UserCheckIcon className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Approve</span>
                              <span className="sm:hidden">Approve</span>
                            </ActionButton>
                          )}
                        </>
                      )}
                      {/* --- Suspend Actions --- */}
                      {u.isSuspended ? (
                        <ActionButton
                          onClick={() => toggleSuspension(u._id, false)}
                          disabled={isBusy}
                          title="Unsuspend User"
                          className="border-green-400/50 text-green-300 hover:bg-green-500/10 flex-1"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Unsuspend</span>
                          <span className="sm:hidden">Unsuspend</span>
                        </ActionButton>
                      ) : (
                        <ActionButton
                          onClick={() => toggleSuspension(u._id, true)}
                          disabled={isBusy}
                          title="Suspend User"
                          className="border-red-400/50 text-red-300 hover:bg-red-500/10 flex-1"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Suspend</span>
                          <span className="sm:hidden">Suspend</span>
                        </ActionButton>
                      )}
                    </div>
                  )}

                  {isSelf && (
                    <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-white/10">
                      (Current User)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminUsers;
