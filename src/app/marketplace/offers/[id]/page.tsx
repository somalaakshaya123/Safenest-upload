"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, HandCoins, Check, X, Eye } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const NEXT_STATUS_LABEL: Record<string, string> = {
  VIEWED: "Mark viewed",
  SHORTLISTED: "Shortlist",
  REJECTED: "Reject",
};

export default function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [offer, setOffer] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  async function load() {
    const res = await fetch(`/api/marketplace/offers/${id}`);
    const data = await res.json();
    if (res.ok) {
      setOffer(data.offer);
      if (data.applications) {
        setApplications(data.applications);
        setIsOwner(true);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function updateStatus(appId: string, status: string) {
    const res = await fetch(`/api/marketplace/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-nest-50">
        <Sidebar />
        <main className="flex flex-1 items-center justify-center"><Loader2 className="animate-spin text-nest-400" size={32} /></main>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="flex min-h-screen bg-nest-50">
        <Sidebar />
        <main className="flex-1 p-8 text-center text-ink/50">Offer not found.</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <HandCoins className="text-nestwarm-500" /> {offer.title}
          </h1>
          <p className="mt-1 text-ink/60">{offer.lenderDisplayName} · {offer.interestRatePct}% p.a.</p>
          <div className="card mt-4">
            <p className="text-sm text-ink/70">{offer.description}</p>
            <p className="mt-3 text-xs text-ink/50">
              ₹{offer.minAmount.toLocaleString("en-IN")}–₹{offer.maxAmount.toLocaleString("en-IN")} ·{" "}
              {offer.minTenureMonths}–{offer.maxTenureMonths} months
            </p>
          </div>

          {isOwner && (
            <>
              <h2 className="mt-8 font-display font-semibold text-ink">Applications ({applications.length})</h2>
              <div className="mt-4 space-y-3">
                {applications.length === 0 && <div className="card text-center text-ink/50">No applications yet.</div>}
                {applications.map((a) => (
                  <div key={a.id} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink">Applicant #{a.borrowerUserId.slice(-6)}</p>
                        {a.matchScore != null && <p className="text-xs text-ink/50">Match score: {a.matchScore}/100 (rule-based)</p>}
                        {a.message && <p className="mt-1 text-sm text-ink/70">"{a.message}"</p>}
                      </div>
                      <span className="rounded-full bg-nest-100 px-3 py-1 text-xs font-semibold text-nest-700">{a.status}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {a.status === "SUBMITTED" && (
                        <button onClick={() => updateStatus(a.id, "VIEWED")} className="btn-secondary !px-3 !py-1.5 text-xs">
                          <Eye size={14} /> Mark viewed
                        </button>
                      )}
                      {(a.status === "SUBMITTED" || a.status === "VIEWED") && (
                        <button onClick={() => updateStatus(a.id, "SHORTLISTED")} className="btn-secondary !px-3 !py-1.5 text-xs !text-nest-700">
                          <Check size={14} /> Shortlist
                        </button>
                      )}
                      {a.status !== "REJECTED" && a.status !== "WITHDRAWN" && (
                        <button onClick={() => updateStatus(a.id, "REJECTED")} className="btn-secondary !px-3 !py-1.5 text-xs !text-red-600">
                          <X size={14} /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
