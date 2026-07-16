"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Landmark,
  ShieldCheck,
  Loader2,
  Calculator,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Scale,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

type RecommendationItem = {
  key: string;
  priority: 1 | 2 | 3;
  category: "financial_health" | "scheme" | "comparison";
  title: string;
  detail: string;
  href?: string;
};

type GovtScheme = {
  id: string;
  name: string;
  shortName: string;
  operatedBy: string;
  benefitSummary: string;
  description: string;
  additionalCriteriaNote?: string;
  officialInfoNote: string;
};

type SchemeMatch = {
  scheme: GovtScheme;
  matchScore: number;
  tier: "Likely Eligible" | "Worth Checking" | "Unlikely Fit";
  reasons: string[];
  cautions: string[];
};

type ComparisonRow = {
  key: string;
  label: string;
  source: "indicative" | "your_analysis";
  description: string;
  rateLowPct: number;
  rateHighPct: number;
  emiLow: number;
  emiHigh: number;
  totalInterestLow: number;
  totalInterestHigh: number;
  notes: string;
};

const TIER_STYLES: Record<string, string> = {
  "Likely Eligible": "bg-nest-100 text-nest-700",
  "Worth Checking": "bg-nestwarm-100 text-nestwarm-700",
  "Unlikely Fit": "bg-ink/5 text-ink/40",
};

const CATEGORY_STYLES: Record<string, string> = {
  financial_health: "bg-red-50 text-red-700",
  scheme: "bg-nest-100 text-nest-700",
  comparison: "bg-skyfeather-400/10 text-skyfeather-600",
};

const TABS = [
  { id: "recommendations", label: "Recommendations" },
  { id: "schemes", label: "Government Schemes" },
  { id: "compare", label: "Loan Comparison" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function SchemesPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestedTab = searchParams.get("tab") as TabId | null;
  const [tab, setTab] = useState<TabId>(requestedTab && TABS.some((t) => t.id === requestedTab) ? requestedTab : "recommendations");

  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [schemeMatches, setSchemeMatches] = useState<SchemeMatch[]>([]);
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/recommendations").then((r) => r.json()),
      fetch("/api/schemes").then((r) => r.json()),
      fetch("/api/compare").then((r) => r.json()),
    ])
      .then(([rec, sch, cmp]) => {
        setConfigured(!!rec.configured);
        setRecommendations(rec.recommendations ?? []);
        setSchemeMatches(sch.matches ?? []);
        setComparisonRows(cmp.rows ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  function selectTab(id: TabId) {
    setTab(id);
    router.replace(`/schemes?tab=${id}`, { scroll: false });
  }

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <Landmark className="text-nest-500" size={26} />
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Recommendations &amp; Schemes</h1>
              <p className="mt-1 text-sm text-ink/60">
                Government scheme matches and lender comparisons, built from your financial profile.
              </p>
            </div>
          </div>

          {/* Rule-based disclosure — required by build-phase compliance rules */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-nest-200 bg-white px-4 py-3 text-sm text-ink/70">
            <Calculator className="mt-0.5 shrink-0 text-nest-500" size={18} />
            <span>
              Everything on this page is produced by <strong>fixed, deterministic rule engines</strong> —{" "}
              <code>src/lib/schemes.ts</code>, <code>src/lib/loanComparison.ts</code>, and{" "}
              <code>src/lib/recommendations.ts</code>. No AI model is called here. Scheme names, benefit summaries,
              and lender rate ranges are illustrative reference data, not live quotes — always verify current
              terms with the lender or official scheme portal before applying.
            </span>
          </div>

          {loading ? (
            <div className="mt-10 flex items-center justify-center gap-2 text-ink/50">
              <Loader2 className="animate-spin" size={18} /> Loading…
            </div>
          ) : !configured ? (
            <div className="card mt-6 flex flex-col items-center gap-3 py-10 text-center">
              <ShieldCheck className="text-nest-400" size={32} />
              <p className="font-semibold text-ink">Complete your financial profile first</p>
              <p className="max-w-sm text-sm text-ink/60">
                Scheme matches and loan comparisons are built from your income, loan purpose, and amount — answer
                the short questionnaire to unlock this page.
              </p>
              <Link href="/onboarding" className="btn-primary mt-2 !px-5 !py-2.5 text-sm">
                Start the questionnaire
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-6 flex gap-2 border-b border-nest-200">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selectTab(t.id)}
                    className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                      tab === t.id ? "border-nest-500 text-nest-700" : "border-transparent text-ink/50 hover:text-ink/80"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "recommendations" && (
                <div className="mt-6 space-y-3">
                  {recommendations.length === 0 ? (
                    <p className="text-sm text-ink/50">No recommendations yet.</p>
                  ) : (
                    recommendations.map((r) => (
                      <div key={r.key} className="card !p-4">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CATEGORY_STYLES[r.category]}`}>
                            {r.category === "financial_health" ? "Financial health" : r.category === "scheme" ? "Government scheme" : "Loan comparison"}
                          </span>
                        </div>
                        <p className="mt-2 font-semibold text-ink">{r.title}</p>
                        <p className="mt-1 text-sm text-ink/60">{r.detail}</p>
                        {r.href && (
                          <Link href={r.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-nest-600">
                            View details <ChevronRight size={14} />
                          </Link>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === "schemes" && (
                <div className="mt-6 space-y-4">
                  {schemeMatches.map((m) => (
                    <div key={m.scheme.id} className="card">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-display font-semibold text-ink">{m.scheme.shortName}</p>
                          <p className="text-xs text-ink/50">{m.scheme.name} · {m.scheme.operatedBy}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${TIER_STYLES[m.tier]}`}>
                          {m.matchScore}% · {m.tier}
                        </span>
                      </div>

                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-nest-100">
                        <div className="h-full rounded-full bg-nest-500" style={{ width: `${m.matchScore}%` }} />
                      </div>

                      <p className="mt-3 text-sm text-ink/70">{m.scheme.description}</p>
                      <p className="mt-1 text-sm font-medium text-ink/80">{m.scheme.benefitSummary}</p>

                      {m.reasons.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {m.reasons.map((r, i) => (
                            <li key={i} className="flex gap-2 text-xs text-nest-700">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-nest-400" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      )}
                      {m.cautions.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {m.cautions.map((c, i) => (
                            <li key={i} className="flex gap-2 text-xs text-nestwarm-700">
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-nestwarm-400" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      )}
                      {m.scheme.additionalCriteriaNote && (
                        <p className="mt-3 rounded-lg bg-nest-50 px-3 py-2 text-xs text-ink/60">
                          {m.scheme.additionalCriteriaNote}
                        </p>
                      )}
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/40">
                        <ExternalLink size={12} /> {m.scheme.officialInfoNote}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {tab === "compare" && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-ink/60">
                    <Scale size={16} className="text-nest-500" />
                    Sorted from lowest to highest indicative/extracted rate.
                  </div>
                  {comparisonRows.map((row) => (
                    <div key={row.key} className="card !p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-ink">{row.label}</p>
                            {row.source === "your_analysis" && (
                              <span className="flex items-center gap-1 rounded-full bg-skyfeather-400/10 px-2 py-0.5 text-[10px] font-semibold text-skyfeather-600">
                                <Sparkles size={10} /> Your analyzed document
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-ink/50">{row.description}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-nest-100 px-3 py-1 text-xs font-semibold text-nest-700">
                          {row.rateLowPct === row.rateHighPct ? `${row.rateLowPct}%` : `${row.rateLowPct}%-${row.rateHighPct}%`} p.a.
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-lg bg-nest-50 px-3 py-2">
                          <p className="text-xs text-ink/50">Estimated EMI</p>
                          <p className="font-semibold text-ink">
                            {row.emiLow === row.emiHigh ? inr(row.emiLow) : `${inr(row.emiLow)} - ${inr(row.emiHigh)}`}/mo
                          </p>
                        </div>
                        <div className="rounded-lg bg-nest-50 px-3 py-2">
                          <p className="text-xs text-ink/50">Total interest over tenure</p>
                          <p className="font-semibold text-ink">
                            {row.totalInterestLow === row.totalInterestHigh
                              ? inr(row.totalInterestLow)
                              : `${inr(row.totalInterestLow)} - ${inr(row.totalInterestHigh)}`}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-ink/50">{row.notes}</p>
                    </div>
                  ))}
                  {comparisonRows.length === 0 && (
                    <p className="text-sm text-ink/50">No comparable lender categories for this loan purpose yet.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SchemesPage() {
  return (
    <Suspense fallback={null}>
      <SchemesPageInner />
    </Suspense>
  );
}
