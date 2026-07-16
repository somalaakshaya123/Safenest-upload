"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, Ban, CheckCircle2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type User = {
  id: string;
  name: string;
  email: string;
  role: "BORROWER" | "LENDER" | "ADMIN";
  isVerified: boolean;
  isDisabled: boolean;
  preferredLang: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (res.ok) setUsers(data.users);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleDisabled(u: User) {
    setBusyId(u.id);
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDisabled: !u.isDisabled }),
    });
    if (res.ok) await load();
    else alert((await res.json()).error);
    setBusyId(null);
  }

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <ShieldAlert className="text-nestwarm-500" /> Users
          </h1>
          <p className="mt-1 text-ink/60">{users.length} accounts. Disabling blocks login immediately.</p>

          {loading ? (
            <div className="mt-16 flex justify-center"><Loader2 className="animate-spin text-nest-400" size={32} /></div>
          ) : (
            <div className="card mt-6 overflow-x-auto !p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-nest-100 text-left text-xs uppercase text-ink/40">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Lang</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-nest-50">
                      <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                      <td className="px-4 py-3 text-ink/70">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-nest-100 px-2 py-0.5 text-xs font-semibold text-nest-700">{u.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        {u.isDisabled ? (
                          <span className="text-xs font-semibold text-red-600">Disabled</span>
                        ) : u.isVerified ? (
                          <span className="text-xs font-semibold text-nest-600">Active</span>
                        ) : (
                          <span className="text-xs font-semibold text-nestwarm-600">Unverified</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink/50">{u.preferredLang}</td>
                      <td className="px-4 py-3">
                        {u.role !== "ADMIN" && (
                          <button
                            onClick={() => toggleDisabled(u)}
                            disabled={busyId === u.id}
                            className="btn-secondary !px-3 !py-1.5 text-xs"
                          >
                            {busyId === u.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : u.isDisabled ? (
                              <><CheckCircle2 size={14} /> Enable</>
                            ) : (
                              <><Ban size={14} /> Disable</>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
