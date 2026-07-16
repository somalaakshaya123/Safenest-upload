"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HandCoins,
  Loader2,
  Plus,
  ShieldCheck,
  ExternalLink,
  Inbox,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

type OfferCategory = "PUBLIC_SECTOR_BANK" | "PRIVATE_BANK" | "NBFC" | "FINTECH" | "GOLD_LOAN" | "SCHEME_LINKED" | "OTHER";

const CATEGORY_LABELS: Record<OfferCategory, string> = {
  PUBLIC_SECTOR_BANK: "Public Sector Bank",
  PRIVATE_BANK: "Private Bank",
  NBFC: "NBFC",
  FINTECH: "Digital / Fintech Lender",
  GOLD_LOAN: "Gold Loan",
  SCHEME_LINKED: "Scheme-Linked",
  OTHER: "Other",
};

type Offer = {
  id: string;
  title: string;
  lenderDisplayName: string;
  category: OfferCategory;
  minAmount: number;
  maxAmount: number;
  interestRatePct: number;
  status: "ACTIVE" | "PAUSED" | "REMOVED";
  applicationCount?: number;
  description: string;
};

type OfferMatch = {
  offer: Offer;
  eligible: boolean;
  matchScore: number;
  tier: "Strong Match" | "Possible Match" | "Not Eligible";
  reasons: string[];
  cautions: string[];
  estimatedEMI: number;
};

const TIER_STYLES: Record<string, string> = {
  "Strong Match": "bg-nest-100 text-nest-700 border-nest-300",
  "Possible Match": "bg-nestwarm-50 text-nestwarm-700 border-nestwarm-300",
  "Not Eligible": "bg-red-50 text-red-700 border-red-200",
};

function fmtINR(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function MarketplacePage() {
  const [role, setRole] = useState<"BORROWER" | "LENDER" | "ADMIN" | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<OfferMatch[] | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [myOffers, setMyOffers] = useState<(Offer & { applicationCount: number })[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [tab, setTab] = useState<"browse" | "mine" | "applications">("browse");
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const s = await fetch("/api/auth/session").then((r) => r.json());
      if (!s.authenticated) return;
      setRole(s.user.role);

      if (s.user.role === "LENDER") {
        setTab("mine");
        const [offersRes, appsRes] = await Promise.all([
          fetch("/api/marketplace/offers?mine=1").then((r) => r.json()),
          fetch("/api/marketplace/applications").then((r) => r.json()),
        ]);
        setMyOffers(offersRes.offers ?? []);
        setApplications(appsRes.applications ?? []);
      } else {
        const [offersRes, appsRes] = await Promise.all([
          fetch("/api/marketplace/offers").then((r) => r.json()),
          fetch("/api/marketplace/applications").then((r) => r.json()),
        ]);
        setMatches(offersRes.matches ?? []);
        setProfileMissing(!!offersRes.profileMissing);
        setApplications(appsRes.applications ?? []);
      }
      setLoading(false);
    })();
  }, []);

  async function apply(offerId: string) {
    setApplyingId(offerId);
    const res = await fetch("/api/marketplace/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, message: message[offerId] || "" }),
    });
    const data = await res.json();
    if (res.ok) {
      const appsRes = await fetch("/api/marketplace/applications").then((r) => r.json());
      setApplications(appsRes.applications ?? []);
    } else {
      alert(data.error || "Could not submit application.");
    }
    setApplyingId(null);
  }

  async function toggleOfferStatus(offer: Offer & { applicationCount: number }) {
    const next = offer.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const res = await fetch(`/api/marketplace/offers/${offer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      setMyOffers((prev) => prev.map((o) => (o.id === offer.id ? { ...o, status: next } : o)));
    }
  }

  async function deleteOffer(id: string) {
    if (!confirm("Delete this offer and all its applications? This cannot be undone.")) return;
    const res = await fetch(`/api/marketplace/offers/${id}`, { method: "DELETE" });
    if (res.ok) setMyOffers((prev) => prev.filter((o) => o.id !== id));
  }

  const appliedOfferIds = new Set(applications.map((a) => a.offerId));

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
                <HandCoins className="text-nestwarm-500" /> Marketplace
              </h1>
              <p className="mt-1 text-ink/60">
                {role === "LENDER"
                  ? "Post loan offers and manage borrower applications."
                  : "Lender offers matched against your financial profile — rule-based, not AI. See src/lib/marketplace.ts."}
              </p>
            </div>
            {role === "LENDER" && (
              <Link href="/marketplace/offers/new" className="btn-primary !px-4 !py-2 text-sm">
                <Plus size={16} /> Post an offer
              </Link>
            )}
          </div>

          {role === "LENDER" && (
            <div className="mt-6 flex gap-2 border-b border-nest-100">
              {(["mine", "applications"] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
                    tab === tabKey ? "border-nest-500 text-nest-700" : "border-transparent text-ink/50 hover:text-ink/80"
                  }`}
                >
                  {tabKey === "mine" ? "My offers" : "Applications received"}
                </button>
              ))}
            </div>
          )}

          {role !== "LENDER" && (
            <div className="mt-6 flex gap-2 border-b border-nest-100">
              {(["browse", "applications"] as const).map((tabKey) => (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  className={`border-b-2 px-4 py-2 text-sm font-semibold transition ${
                    tab === tabKey ? "border-nest-500 text-nest-700" : "border-transparent text-ink/50 hover:text-ink/80"
                  }`}
                >
                  {tabKey === "browse" ? "Browse offers" : "My applications"}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="mt-16 flex justify-center"><Loader2 className="animate-spin text-nest-400" size={32} /></div>
          ) : (
            <div className="mt-6 space-y-4">
              {/* Borrower: browse tab */}
              {role !== "LENDER" && tab === "browse" && (
                <>
                  {profileMissing && (
                    <div className="card border-nestwarm-300 bg-nestwarm-50 text-sm text-nestwarm-700">
                      Complete your{" "}
                      <Link href="/onboarding" className="font-semibold underline">financial profile</Link>{" "}
                      to see personalized match scores. Offers are still listed below.
                    </div>
                  )}
                  {(!matches || matches.length === 0) && (
                    <div className="card text-center text-ink/50">No lender offers are posted yet.</div>
                  )}
                  {matches?.map((m) => (
                    <div key={m.offer.id} className="card">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-semibold text-ink">{m.offer.title}</h3>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TIER_STYLES[m.tier]}`}>
                              {m.tier} · {m.matchScore}/100
                            </span>
                          </div>
                          <p className="text-sm text-ink/60">
                            {m.offer.lenderDisplayName} · {CATEGORY_LABELS[m.offer.category]}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-ink">{m.offer.interestRatePct}% p.a.</p>
                          <p className="text-ink/50">Est. EMI {fmtINR(m.estimatedEMI)}/mo</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-ink/70">{m.offer.description}</p>
                      <p className="mt-2 text-xs text-ink/50">
                        Range: {fmtINR(m.offer.minAmount)} – {fmtINR(m.offer.maxAmount)}
                      </p>
                      {m.reasons.length > 0 && (
                        <ul className="mt-3 space-y-1 text-xs text-nest-700">
                          {m.reasons.map((r, i) => (
                            <li key={i} className="flex items-start gap-1.5"><ShieldCheck size={13} className="mt-0.5 shrink-0" /> {r}</li>
                          ))}
                        </ul>
                      )}
                      {m.cautions.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-nestwarm-700">
                          {m.cautions.map((c, i) => (
                            <li key={i}>⚠ {c}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-4 flex items-center gap-2">
                        {appliedOfferIds.has(m.offer.id) ? (
                          <span className="text-sm font-semibold text-nest-600">Already applied ✓</span>
                        ) : (
                          <>
                            <input
                              placeholder="Optional message to the lender"
                              value={message[m.offer.id] || ""}
                              onChange={(e) => setMessage((prev) => ({ ...prev, [m.offer.id]: e.target.value }))}
                              className="input flex-1 !py-1.5 text-sm"
                            />
                            <button
                              onClick={() => apply(m.offer.id)}
                              disabled={applyingId === m.offer.id}
                              className="btn-primary !px-4 !py-1.5 text-sm"
                            >
                              {applyingId === m.offer.id ? <Loader2 className="animate-spin" size={14} /> : "Apply"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  <p className="pt-2 text-center text-xs text-ink/40">
                    Match scores are 100% rule-based (src/lib/marketplace.ts) — no AI or BYOK call involved.
                  </p>
                </>
              )}

              {/* Borrower: applications tab */}
              {role !== "LENDER" && tab === "applications" && (
                <>
                  {applications.length === 0 && <div className="card text-center text-ink/50">You haven't applied to any offers yet.</div>}
                  {applications.map((a) => (
                    <div key={a.id} className="card flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-ink">{a.offer.title}</p>
                        <p className="text-sm text-ink/60">{a.offer.lenderDisplayName}</p>
                      </div>
                      <span className="rounded-full bg-nest-100 px-3 py-1 text-xs font-semibold text-nest-700">{a.status}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Lender: my offers */}
              {role === "LENDER" && tab === "mine" && (
                <>
                  {myOffers.length === 0 && (
                    <div className="card text-center text-ink/50">
                      You haven't posted any offers yet.{" "}
                      <Link href="/marketplace/offers/new" className="font-semibold text-nest-600 underline">Post your first one →</Link>
                    </div>
                  )}
                  {myOffers.map((o) => (
                    <div key={o.id} className="card flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/marketplace/offers/${o.id}`} className="font-semibold text-ink hover:underline">{o.title}</Link>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              o.status === "ACTIVE" ? "bg-nest-100 text-nest-700" : o.status === "PAUSED" ? "bg-nestwarm-50 text-nestwarm-700" : "bg-red-50 text-red-700"
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>
                        <p className="text-sm text-ink/60">
                          {fmtINR(o.minAmount)}–{fmtINR(o.maxAmount)} · {o.interestRatePct}% p.a. · {o.applicationCount} application{o.applicationCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/marketplace/offers/${o.id}`} className="btn-secondary !px-3 !py-1.5 text-xs">
                          <Inbox size={14} /> Applications
                        </Link>
                        {o.status !== "REMOVED" && (
                          <button onClick={() => toggleOfferStatus(o)} className="btn-secondary !px-3 !py-1.5 text-xs">
                            {o.status === "ACTIVE" ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                        )}
                        <button onClick={() => deleteOffer(o.id)} className="btn-secondary !px-3 !py-1.5 text-xs !text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Lender: applications received */}
              {role === "LENDER" && tab === "applications" && (
                <>
                  {applications.length === 0 && <div className="card text-center text-ink/50">No applications yet.</div>}
                  {applications.map((a) => (
                    <Link
                      key={a.id}
                      href={`/marketplace/offers/${a.offerId}`}
                      className="card flex items-center justify-between gap-4 transition hover:shadow-cardHover"
                    >
                      <div>
                        <p className="font-semibold text-ink">{a.offer.title}</p>
                        {a.message && <p className="mt-1 text-sm text-ink/60">"{a.message}"</p>}
                        {a.matchScore != null && <p className="mt-1 text-xs text-ink/40">Match score at application: {a.matchScore}/100</p>}
                      </div>
                      <span className="flex items-center gap-1 rounded-full bg-nest-100 px-3 py-1 text-xs font-semibold text-nest-700">
                        {a.status} <ExternalLink size={12} />
                      </span>
                    </Link>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
