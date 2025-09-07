// src/pages/admin/Users.tsx
import React, { useEffect, useState } from "react";
import Title from "../../components/admin/Title";
import Loading from "../../components/Loading";
import { AdminAPI } from "../../lib/api";

type Row = Awaited<ReturnType<typeof AdminAPI.listUsers>>[number];

const Users: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await AdminAPI.listUsers();
        setRows(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return loading ? (
    <Loading />
  ) : (
    <>
      <Title text1="All" text2="Users" />
      <div className="max-w-4xl mt-6 overflow-x-auto">
        <table className="w-full border-collapse rounded-md overflow-hidden text-nowrap">
          <thead>
            <tr className="bg-primary/20 text-left text-white">
              <th className="p-2 font-medium pl-15">Username</th>
              <th className="p-2 font-medium">Email</th>
              <th className="p-2 font-medium">Role</th>
              <th className="p-2 font-medium">Approved</th>
            </tr>
          </thead>
          <tbody className="text-sm font-light">
            {rows.map((u) => (
              <tr
                key={u._id}
                className="border-b border-primary/10 bg-primary/5 even:bg-primary/10"
              >
                <td className="p-2">{u.username}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2 capitalize">{u.role}</td>
                <td className="p-2">
                  {u.role === "organizer"
                    ? u.isApproved
                      ? "Yes"
                      : "Pending"
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};
export default Users;
