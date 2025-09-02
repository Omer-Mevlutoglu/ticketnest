// src/pages/admin/OrganizerApprovals.tsx
import React, { useMemo, useState } from "react";
import Title from "../../components/admin/Title";
import BlurCircle from "../../components/BlurCircle";
import {
  XIcon,
  MailIcon,
  PhoneIcon,
  Building2Icon,
  CalendarClockIcon,
  ShieldCheckIcon,
  FilterIcon,
  SearchIcon,
} from "lucide-react";

type OrganizerStatus = "pending" | "approved" | "rejected";

type Organizer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  submittedAt: string; // ISO
  status: OrganizerStatus;
  avatar?: string;
};

const MOCK_ORGANIZERS: Organizer[] = [
  {
    id: "org_1",
    firstName: "Sara",
    lastName: "Khan",
    email: "sara.khan@example.com",
    phone: "+1 (555) 201-8821",
    company: "Skyline Events",
    website: "https://skyline.events",
    submittedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    status: "pending",
    avatar: "",
  },
  {
    id: "org_2",
    firstName: "Jon",
    lastName: "Martinez",
    email: "jon.martinez@example.com",
    phone: "+1 (555) 441-1134",
    company: "Crimson Productions",
    website: "https://crimson.productions",
    submittedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    status: "pending",
    avatar: "",
  },
  {
    id: "org_3",
    firstName: "Mina",
    lastName: "Abdelrahman",
    email: "mina.a@example.com",
    phone: "+90 (532) 123 45 67",
    company: "Paper Skies Co.",
    submittedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
    status: "approved",
    avatar: "",
  },
  {
    id: "org_4",
    firstName: "Yuki",
    lastName: "Tanaka",
    email: "yuki.t@example.com",
    phone: "+81 90-1234-5678",
    company: "Horizon Live",
    submittedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    status: "rejected",
    avatar: "",
  },
];

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const chipClasses: Record<OrganizerStatus, string> = {
  pending: "bg-yellow-600/20 text-yellow-300 border border-yellow-600/30",
  approved: "bg-emerald-600/20 text-emerald-300 border border-emerald-600/30",
  rejected: "bg-rose-600/20 text-rose-300 border border-rose-600/30",
};

const OrganizerApprovals: React.FC = () => {
  const [items, setItems] = useState<Organizer[]>(MOCK_ORGANIZERS);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrganizerStatus | "all">(
    "pending"
  );

  const summary = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => i.status === "pending").length;
    const approved = items.filter((i) => i.status === "approved").length;
    const rejected = items.filter((i) => i.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      const okStatus =
        statusFilter === "all" ? true : i.status === statusFilter;
      const okQuery =
        !q ||
        [i.firstName, i.lastName, i.email, i.company ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return okStatus && okQuery;
    });
  }, [items, query, statusFilter]);

  const updateStatus = (id: string, status: OrganizerStatus) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  return (
    <>
      <Title text1="Organizer" text2="Approvals" />

      {/* Summary + Controls */}
      <div className="mt-6 relative">
        <BlurCircle top="-80px" left="-40px" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-sm">Total</p>
            <p className="text-xl font-semibold">{summary.total}</p>
          </div>
          <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-sm">Pending</p>
            <p className="text-xl font-semibold">{summary.pending}</p>
          </div>
          <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-sm ">Approved</p>
            <p className="text-xl font-semibold">{summary.approved}</p>
          </div>
          <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-sm">Rejected</p>
            <p className="text-xl font-semibold">{summary.rejected}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 max-w-md">
            <SearchIcon className="w-4 h-4 text-gray-300" />
            <input
              className="bg-transparent outline-none text-sm w-full placeholder:text-gray-400"
              placeholder="Search name, email, or company…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <FilterIcon className="w-4 h-4 text-gray-300" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as OrganizerStatus | "all")
              }
              className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visible.map((org) => {
          const fullName = `${org.firstName} ${org.lastName}`;
          const canApprove = org.status !== "approved";
          const canReject = org.status !== "rejected";

          return (
            <div
              key={org.id}
              className="group border border-primary/20 bg-primary/10 rounded-xl p-4 hover:-translate-y-0.5 transition duration-300"
            >
              <div className="flex items-start gap-4">
                {/* avatar */}
                <div className="h-12 w-12 rounded-full overflow-hidden bg-white/10 shrink-0">
                  {/* Empty src, just alt as requested */}
                  <img
                    src={org.avatar || ""}
                    alt={`${fullName} avatar`}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold truncate">{fullName}</h3>
                    <span
                      className={`text-[11px] px-2 py-1 rounded-full ${
                        chipClasses[org.status]
                      }`}
                    >
                      {org.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-gray-300">
                    <p className="flex items-center gap-2 truncate">
                      <MailIcon className="w-4 h-4" />
                      {org.email}
                    </p>
                    {org.phone && (
                      <p className="flex items-center gap-2 truncate">
                        <PhoneIcon className="w-4 h-4" />
                        {org.phone}
                      </p>
                    )}
                    {org.company && (
                      <p className="flex items-center gap-2 truncate">
                        <Building2Icon className="w-4 h-4" />
                        {org.company}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <CalendarClockIcon className="w-4 h-4" />
                      {formatDateTime(org.submittedAt)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      disabled={!canApprove}
                      onClick={() => updateStatus(org.id, "approved")}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-xs rounded-md transition ${
                        canApprove
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-emerald-600/30 text-white/60 cursor-not-allowed"
                      }`}
                    >
                      <ShieldCheckIcon className="w-4 h-4" />
                      Approve
                    </button>

                    <button
                      disabled={!canReject}
                      onClick={() => updateStatus(org.id, "rejected")}
                      className={`inline-flex items-center gap-2 px-3 py-2 text-xs rounded-md transition ${
                        canReject
                          ? "bg-rose-600 hover:bg-rose-500 text-white"
                          : "bg-rose-600/30 text-white/60 cursor-not-allowed"
                      }`}
                    >
                      <XIcon className="w-4 h-4" />
                      Reject
                    </button>

                    {org.status === "pending" && (
                      <button
                        onClick={() => updateStatus(org.id, "pending")}
                        className="ml-auto text-xs text-gray-300/80 px-2 py-1 rounded-md border border-white/10 hover:bg-white/5 transition"
                        title="Keep Pending"
                      >
                        Keep Pending
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div className="col-span-full text-sm text-gray-400 border border-white/10 rounded-lg p-6">
            No organizers match your filters.
          </div>
        )}
      </div>
    </>
  );
};

export default OrganizerApprovals;
