/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/admin/OrganizerApprovals.tsx
import React, { useEffect, useMemo, useState } from "react";
import Title from "../../components/admin/Title";
import BlurCircle from "../../components/BlurCircle";
import {
  XIcon, MailIcon,
  CalendarClockIcon, ShieldCheckIcon, FilterIcon, SearchIcon,
} from "lucide-react";
import { AdminAPI } from "../../lib/api";
import toast from "react-hot-toast";

type OrganizerStatus = "pending" | "approved" | "rejected";
type PendingItem = {
  _id: string;
  organizerId: { _id: string; username: string; email: string; role: string; isApproved: boolean };
  status: OrganizerStatus;
  createdAt: string;
  updatedAt: string;
};

const chipClasses: Record<OrganizerStatus, string> = {
  pending: "bg-yellow-600/20 text-yellow-300 border border-yellow-600/30",
  approved: "bg-emerald-600/20 text-emerald-300 border border-emerald-600/30",
  rejected: "bg-rose-600/20 text-rose-300 border border-rose-600/30",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });

const OrganizerApprovals: React.FC = () => {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrganizerStatus | "all">("pending");

  const fetchPending = async () => {
    try {
      setLoading(true);
      const data = await AdminAPI.listPendingOrganizers();
      setItems(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

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
      const okStatus = statusFilter === "all" ? true : i.status === statusFilter;
      const okQuery =
        !q ||
        [i.organizerId.username, i.organizerId.email]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return okStatus && okQuery;
    });
  }, [items, query, statusFilter]);

  const approve = async (id: string) => {
    try {
      await AdminAPI.approveOrganizer(id);
      toast.success("Organizer approved");
      setItems((prev) =>
        prev.map((it) => (it.organizerId._id === id ? { ...it, status: "approved" } : it))
      );
    } catch (e: any) {
      toast.error(e.message || "Approve failed");
    }
  };
  const reject = async (id: string) => {
    try {
      await AdminAPI.rejectOrganizer(id);
      toast.success("Organizer rejected");
      setItems((prev) =>
        prev.map((it) => (it.organizerId._id === id ? { ...it, status: "rejected" } : it))
      );
    } catch (e: any) {
      toast.error(e.message || "Reject failed");
    }
  };

  return (
    <>
      <Title text1="Organizer" text2="Approvals" />
      <div className="mt-6 relative">
        <BlurCircle top="-80px" left="-40px" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-sm">Total</p><p className="text-xl font-semibold">{summary.total}</p>
          </div>
          <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-sm">Pending</p><p className="text-xl font-semibold">{summary.pending}</p>
          </div>
          <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-sm">Approved</p><p className="text-xl font-semibold">{summary.approved}</p>
          </div>
          <div className="px-4 py-3 bg-primary/10 border border-primary/20 rounded-md">
            <p className="text-sm">Rejected</p><p className="text-xl font-semibold">{summary.rejected}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 max-w-md">
            <SearchIcon className="w-4 h-4 text-gray-300" />
            <input
              className="bg-transparent outline-none text-sm w-full placeholder:text-gray-400"
              placeholder="Search username or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <FilterIcon className="w-4 h-4 text-gray-300" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-sm text-gray-400 border border-white/10 rounded-lg p-6">
            Loading…
          </div>
        ) : visible.length === 0 ? (
          <div className="col-span-full text-sm text-gray-400 border border-white/10 rounded-lg p-6">
            No organizers match your filters.
          </div>
        ) : (
          visible.map((req) => {
            const name = req.organizerId.username;
            return (
              <div key={req._id} className="group border border-primary/20 bg-primary/10 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full grid place-items-center bg-white/10 shrink-0">
                    {name[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold truncate">{name}</h3>
                      <span className={`text-[11px] px-2 py-1 rounded-full ${chipClasses[req.status]}`}>
                        {req.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 text-sm text-gray-300">
                      <p className="flex items-center gap-2 truncate">
                        <MailIcon className="w-4 h-4" /> {req.organizerId.email}
                      </p>
                      <p className="flex items-center gap-2">
                        <CalendarClockIcon className="w-4 h-4" /> {fmt(req.createdAt)}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <button
                        onClick={() => approve(req.organizerId._id)}
                        disabled={req.status === "approved"}
                        className={`inline-flex items-center gap-2 px-3 py-2 text-xs rounded-md transition ${
                          req.status === "approved"
                            ? "bg-emerald-600/30 text-white/60 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        }`}
                      >
                        <ShieldCheckIcon className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => reject(req.organizerId._id)}
                        disabled={req.status === "rejected"}
                        className={`inline-flex items-center gap-2 px-3 py-2 text-xs rounded-md transition ${
                          req.status === "rejected"
                            ? "bg-rose-600/30 text-white/60 cursor-not-allowed"
                            : "bg-rose-600 hover:bg-rose-500 text-white"
                        }`}
                      >
                        <XIcon className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default OrganizerApprovals;
