"use client";

import { useEffect, useState } from "react";
import { Loader2, HandCoins, Pause, Play, Ban } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Offer = {
  id: string;
  title: string;
  lenderDisplayName: string;
  status: "ACTIVE" | "PAUSED" | "REMOVED";
  interestRatePct: number;
  _count: { applications: number };
};

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/offers");
    const data = await res.json();
    if (res.ok) setOffers(data.offers);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    setBusyId(id);
    const body: any = { status };
    if (status === "REMOVED") {
      const reason = prompt("Reason for removal (shown in audit log):") || "Removed by admin";
      body.removedReason = reason;
    }
    const res = await fetch(`/api/admin/offers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) await load();
    setBusyId(null);
  }

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <HandCoins className="text-nestwarm-500" /> Marketplace offers
          </h1>
          <p className="mt-1 text-ink/60">Moderate lender listings. Removal is permanent-facing (borrowers can no longer see it).</p>

          {loading ? (
            <div className="mt-16 flex justify-center"><Loader2 className="animate-spin text-nest-400" size={32} /></div>
          ) : (
            <div className="mt-6 space-y-3">
              {offers.map((o) => (
                <div key={o.id} className="card flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-ink">{o.title}</p>
                    <p className="text-sm text-ink/60">{o.lenderDisplayName} · {o.interestRatePct}% p.a. · {o._count.applications} applications</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        o.status === "ACTIVE" ? "bg-nest-100 text-nest-700" : o.status === "PAUSED" ? "bg-nestwarm-50 text-nestwarm-700" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {o.status}
                    </span>
                    {busyId === o.id ? (
                      <Loader2 className="animate-spin text-nest-400" size={16} />
                    ) : (
                      <>
                        {o.status === "ACTIVE" && (
                          <button onClick={() => setStatus(o.id, "PAUSED")} className="btn-secondary !px-3 !py-1.5 text-xs"><Pause size={14} /></button>
                        )}
                        {o.status === "PAUSED" && (
                          <button onClick={() => setStatus(o.id, "ACTIVE")} className="btn-secondary !px-3 !py-1.5 text-xs"><Play size={14} /></button>
                        )}
                        {o.status !== "REMOVED" && (
                          <button onClick={() => setStatus(o.id, "REMOVED")} className="btn-secondary !px-3 !py-1.5 text-xs !text-red-600"><Ban size={14} /></button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
