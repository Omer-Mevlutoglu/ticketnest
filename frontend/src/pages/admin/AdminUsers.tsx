import React from "react";
import BlurCircle from "../../components/BlurCircle";
import Loading from "../../components/Loading";
import { useAdminUsers, type Role } from "./hooks/useAdminUsers";

function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    admin: "border-sky-400 text-sky-300",
    organizer: "border-violet-400 text-violet-300",
    attendee: "border-emerald-400 text-emerald-300",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${map[role]}`}>
      {role}
    </span>
  );
}

function ApprovalBadge({ ok }: { ok?: boolean }) {
  if (ok === undefined) return null;
  return ok ? (
    <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-400 text-emerald-300">
      approved
    </span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full border border-yellow-400 text-yellow-300">
      pending
    </span>
  );
}

const AdminUsers: React.FC = () => {
  const { loading, error, users, query, setQuery, role, setRole, refetch } =
    useAdminUsers();

  if (loading) return <Loading />;

  return (
    <div className="relative px-6 md:px-10 lg:px-16 pt-8 pb-16">
      <BlurCircle top="0" right="-100px" />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Users</h1>

        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email / username / id…"
            className="rounded-md bg-black/30 border border-white/15 px-3 py-2 text-sm w-[220px]"
          />
          <select
            className="rounded-md bg-black/30 border border-white/15 px-3 py-2 text-sm"
            value={role}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(e) => setRole(e.target.value as any)}
          >
            <option value="all">All roles</option>
            <option value="attendee">Attendee</option>
            <option value="organizer">Organizer</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={refetch}
            className="px-3 py-2 text-sm rounded-md border border-white/15 hover:bg-white/10 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {users.length === 0 ? (
        <p className="mt-8 text-gray-400">No users match your filter.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm border border-white/10 rounded-lg overflow-hidden">
            <thead className="bg-white/5">
              <tr className="[&>th]:text-left [&>th]:px-4 [&>th]:py-2">
                <th>User</th>
                <th>Role</th>
                <th>Organizer status</th>
                <th>User ID</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b [&>tr]:border-white/10">
              {users.map((u) => {
                const created = u.createdAt
                  ? new Date(u.createdAt).toLocaleString()
                  : "—";
                const updated = u.updatedAt
                  ? new Date(u.updatedAt).toLocaleString()
                  : "—";
                const label = u.username || u.email || u._id;

                return (
                  <tr key={u._id} className="[&>td]:px-4 [&>td]:py-2 align-top">
                    <td>
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="whitespace-nowrap">
                      {/* only meaningful for organizers */}
                      {u.role === "organizer" ? (
                        <ApprovalBadge ok={u.isApproved} />
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="text-xs text-gray-400">{u._id}</td>
                    <td className="whitespace-nowrap">{created}</td>
                    <td className="whitespace-nowrap">{updated}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
