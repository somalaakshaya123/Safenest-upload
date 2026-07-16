"use client";

import { useEffect, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Log = {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  user: { name: string; email: string; role: string } | null;
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/audit-logs")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <ScrollText className="text-nestwarm-500" /> Audit logs
          </h1>
          <p className="mt-1 text-ink/60">Most recent {logs.length} actions across the platform.</p>

          {loading ? (
            <div className="mt-16 flex justify-center"><Loader2 className="animate-spin text-nest-400" size={32} /></div>
          ) : (
            <div className="mt-6 space-y-2">
              {logs.map((l) => (
                <div key={l.id} className="card !py-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">{l.action}</p>
                    {l.details && <p className="text-xs text-ink/50">{l.details}</p>}
                    <p className="text-xs text-ink/40">{l.user ? `${l.user.name} (${l.user.role})` : "system"}</p>
                  </div>
                  <p className="whitespace-nowrap text-xs text-ink/40">{new Date(l.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
