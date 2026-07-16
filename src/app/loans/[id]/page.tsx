"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  Calculator,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Info,
  FileText,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ScoreGauge from "@/components/ScoreGauge";

type ExtractedFields = {
  lenderName: string | null;
  loanType: string | null;
  principalAmount: number | null;
  currency: string | null;
  interestRatePct: number | null;
  interestRateType: "fixed" | "floating" | null;
  aprPct: number | null;
  tenureMonths: number | null;
  processingFeePct: number | null;
  prepaymentPenaltyPct: number | null;
  hasForeclosureLockIn: boolean;
  insuranceBundled: boolean;
  otherFees: { name: string; detail: string }[];
  redFlagsNoted: string[];
};

type RiskFlag = { key: string; severity: "info" | "caution" | "warning"; message: string };

type DocDetail = {
  id: string;
  title: string | null;
  rawText: string;
  status: "PENDING" | "ANALYZED" | "FAILED";
  errorMessage: string | null;
  aiProvider: string | null;
  aiModel: string | null;
  plainSummary: string | null;
  extracted: ExtractedFields | null;
  analyzedAt: string | null;
  riskScore: number | null;
  riskBand: string | null;
  riskFlags: RiskFlag[];
  createdAt: string;
};

const BAND_STYLES: Record<string, string> = {
  Excellent: "bg-nest-100 text-nest-700",
  Good: "bg-nest-100 text-nest-700",
  Fair: "bg-nestwarm-100 text-nestwarm-700",
  "At Risk": "bg-nestwarm-100 text-nestwarm-700",
  Critical: "bg-red-50 text-red-700",
};

const FLAG_STYLES: Record<RiskFlag["severity"], string> = {
  info: "border-nest-200 bg-nest-50 text-ink/70",
  caution: "border-nestwarm-300 bg-nestwarm-50 text-nestwarm-700",
  warning: "border-red-200 bg-red-50 text-red-700",
};

function fmt(v: number | null, suffix = "") {
  return v === null || v === undefined ? "—" : `${v}${suffix}`;
}

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);

  function load() {
    fetch(`/api/loans/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error && !data.id) {
          router.push("/loans");
          return;
        }
        setDoc(data);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handleReanalyze() {
    setReanalyzing(true);
    const res = await fetch(`/api/loans/${params.id}`, { method: "POST" });
    const data = await res.json();
    setReanalyzing(false);
    setDoc(data);
  }

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/loans" className="flex items-center gap-1.5 text-sm font-medium text-ink/50 hover:text-ink/80">
            <ArrowLeft size={16} /> Back to all analyses
          </Link>

          {loading || !doc ? (
            <div className="mt-10 flex items-center justify-center gap-2 text-ink/50">
              <Loader2 className="animate-spin" size={18} /> Loading…
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-center justify-between">
                <h1 className="font-display text-2xl font-bold text-ink">{doc.title || "Untitled document"}</h1>
                <button onClick={handleReanalyze} disabled={reanalyzing} className="btn-secondary !px-4 !py-2 text-sm">
                  {reanalyzing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                  Re-analyze
                </button>
              </div>
              <p className="mt-1 text-sm text-ink/50">
                Submitted {new Date(doc.createdAt).toLocaleString("en-IN")}
              </p>

              {doc.status === "FAILED" && (
                <div className="card mt-6 flex items-start gap-3 border-red-200 bg-red-50">
                  <AlertTriangle className="mt-0.5 shrink-0 text-red-500" size={20} />
                  <div>
                    <p className="font-semibold text-red-700">Analysis failed</p>
                    <p className="mt-1 text-sm text-red-600">{doc.errorMessage}</p>
                    <Link href="/settings/ai" className="mt-2 inline-block text-sm font-semibold text-red-700 underline">
                      Check AI Configuration →
                    </Link>
                  </div>
                </div>
              )}

              {doc.status === "PENDING" && (
                <div className="card mt-6 flex items-center gap-2 text-ink/60">
                  <Loader2 className="animate-spin" size={18} /> Analysis in progress…
                </div>
              )}

              {doc.status === "ANALYZED" && doc.extracted && (
                <>
                  {/* AI disclosure banner */}
                  <div className="mt-6 flex items-center gap-2 rounded-xl border border-nest-200 bg-white px-4 py-3 text-sm text-ink/70">
                    <Sparkles className="shrink-0 text-nest-500" size={18} />
                    <span>
                      Extraction &amp; summary powered by <strong>{doc.aiProvider}/{doc.aiModel}</strong> using your
                      own API key. Analyzed {doc.analyzedAt ? new Date(doc.analyzedAt).toLocaleString("en-IN") : "—"}.
                    </span>
                  </div>

                  {/* Risk score — deterministic engine */}
                  <div className="card mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
                    <ScoreGauge score={doc.riskScore ?? 0} band={doc.riskBand ?? "Fair"} />
                    <div className="flex flex-col items-center gap-3 sm:items-start">
                      <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${BAND_STYLES[doc.riskBand ?? "Fair"]}`}>
                        {doc.riskBand} loan terms
                      </span>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <Stat label="Lender" value={doc.extracted.lenderName ?? "Not stated"} />
                        <Stat label="Loan type" value={doc.extracted.loanType ?? "Not stated"} />
                        <Stat
                          label="Principal"
                          value={
                            doc.extracted.principalAmount
                              ? `${doc.extracted.currency ?? "₹"} ${doc.extracted.principalAmount.toLocaleString("en-IN")}`
                              : "Not stated"
                          }
                        />
                        <Stat
                          label="Interest rate"
                          value={`${fmt(doc.extracted.interestRatePct, "%")} p.a.${doc.extracted.interestRateType ? ` (${doc.extracted.interestRateType})` : ""}`}
                        />
                        <Stat label="Tenure" value={doc.extracted.tenureMonths ? `${doc.extracted.tenureMonths} months` : "Not stated"} />
                      </div>
                    </div>
                  </div>

                  {/* Rule-based disclosure */}
                  <div className="mt-6 flex items-start gap-2 rounded-xl border border-nest-200 bg-white px-4 py-3 text-sm text-ink/70">
                    <Calculator className="mt-0.5 shrink-0 text-nest-500" size={18} />
                    <span>
                      The score above comes from a fixed, deterministic rule engine run on the numbers the AI
                      extracted — <strong>the AI itself never assigns a risk score</strong>. Formulas live in{" "}
                      <code>src/lib/riskEngine.ts</code>.
                    </span>
                  </div>

                  {/* Plain language summary */}
                  <div className="card mt-6">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-nest-500" size={18} />
                      <h2 className="font-display font-semibold text-ink">Plain-language summary</h2>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink/70">{doc.plainSummary}</p>
                  </div>

                  {/* Fee breakdown */}
                  <div className="card mt-6">
                    <h2 className="font-display font-semibold text-ink">Fees &amp; extracted terms</h2>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Stat label="Effective APR" value={doc.extracted.aprPct ? `${doc.extracted.aprPct}%` : "Not separately stated"} />
                      <Stat label="Processing fee" value={doc.extracted.processingFeePct ? `${doc.extracted.processingFeePct}%` : "Not stated"} />
                      <Stat label="Prepayment penalty" value={doc.extracted.prepaymentPenaltyPct ? `${doc.extracted.prepaymentPenaltyPct}%` : "None stated"} />
                      <Stat label="Foreclosure lock-in" value={doc.extracted.hasForeclosureLockIn ? "Yes" : "No / not stated"} />
                      <Stat label="Insurance bundled" value={doc.extracted.insuranceBundled ? "Yes" : "No / not stated"} />
                    </div>
                    {doc.extracted.otherFees.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-ink/70">Other fees noted</p>
                        <ul className="mt-2 space-y-1">
                          {doc.extracted.otherFees.map((f, i) => (
                            <li key={i} className="text-sm text-ink/60">
                              <span className="font-medium text-ink">{f.name}:</span> {f.detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Risk flags */}
                  {doc.riskFlags.length > 0 && (
                    <div className="card mt-6">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="text-nestwarm-500" size={18} />
                        <h2 className="font-display font-semibold text-ink">Points worth your attention</h2>
                      </div>
                      <ul className="mt-4 space-y-2">
                        {doc.riskFlags.map((f, i) => (
                          <li key={i} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${FLAG_STYLES[f.severity]}`}>
                            <Info size={14} className="mt-0.5 shrink-0" /> {f.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Source text */}
                  <details className="card mt-6">
                    <summary className="flex cursor-pointer items-center gap-2 font-display font-semibold text-ink">
                      <FileText size={18} className="text-ink/40" /> View original pasted text
                    </summary>
                    <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-nest-50 p-4 text-xs text-ink/70">
                      {doc.rawText}
                    </pre>
                  </details>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-lg bg-nest-50 px-3 py-2">
      <span className="text-ink/50">{label}</span>
      <span className="text-right font-semibold text-ink">{value}</span>
    </div>
  );
}
