"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Calculator, Loader2, PenLine, ShieldCheck } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import ScoreGauge from "@/components/ScoreGauge";

type BreakdownItem = {
  key: string;
  label: string;
  weight: number;
  score: number;
  detail: string;
};

type ProfileResponse = {
  configured: boolean;
  employmentType?: string;
  loanPurpose?: string;
  desiredLoanAmount?: number;
  desiredTenureMonths?: number;
  result?: {
    score: number;
    band: string;
    dtiRatio: number;
    emiBurdenRatio: number;
    savingsRatio: number;
    estimatedNewEMI: number;
    assumedAnnualRatePct: number;
    breakdown: BreakdownItem[];
    recommendations: string[];
  };
};

const BAND_STYLES: Record<string, string> = {
  Excellent: "bg-nest-100 text-nest-700",
  Good: "bg-nest-100 text-nest-700",
  Fair: "bg-nestwarm-100 text-nestwarm-700",
  "At Risk": "bg-nestwarm-100 text-nestwarm-700",
  Critical: "bg-red-50 text-red-700",
};

function inr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export default function FinancialHealthPage() {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Financial Health</h1>
              <p className="mt-1 text-sm text-ink/60">A transparent, explainable snapshot of your loan readiness.</p>
            </div>
            {data?.configured && (
              <Link href="/onboarding" className="btn-secondary !px-4 !py-2 text-sm">
                <PenLine size={16} /> Update answers
              </Link>
            )}
          </div>

          {/* Rule-based disclosure — required by build-phase compliance rules */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-nest-200 bg-white px-4 py-3 text-sm text-ink/70">
            <Calculator className="mt-0.5 shrink-0 text-nest-500" size={18} />
            <span>
              This score is calculated by a fixed, deterministic rule engine (weighted debt-to-income, affordability,
              savings, income stability, and household-burden checks). <strong>No AI model is used to produce it</strong> —
              every number can be traced back to a formula in <code>src/lib/scoring.ts</code>.
            </span>
          </div>

          {loading ? (
            <div className="mt-10 flex items-center justify-center gap-2 text-ink/50">
              <Loader2 className="animate-spin" size={18} /> Loading…
            </div>
          ) : !data?.configured || !data.result ? (
            <div className="card mt-6 flex flex-col items-center gap-3 py-10 text-center">
              <ShieldCheck className="text-nest-400" size={32} />
              <p className="font-semibold text-ink">You haven't completed your financial profile yet</p>
              <p className="max-w-sm text-sm text-ink/60">
                Answer a short set of questions about your income, expenses, and loan goal to get your Financial
                Health score.
              </p>
              <Link href="/onboarding" className="btn-primary mt-2 !px-5 !py-2.5 text-sm">
                Start the questionnaire
              </Link>
            </div>
          ) : (
            <>
              <div className="card mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
                <ScoreGauge score={data.result.score} band={data.result.band} />
                <div className="flex flex-col items-center gap-3 sm:items-start">
                  <span className={`w-fit rounded-full px-3 py-1 text-sm font-semibold ${BAND_STYLES[data.result.band]}`}>
                    {data.result.band}
                  </span>
                  <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-1">
                    <Stat label="Debt-to-income" value={`${(data.result.dtiRatio * 100).toFixed(1)}%`} />
                    <Stat label="Total EMI burden (incl. new loan)" value={`${(data.result.emiBurdenRatio * 100).toFixed(1)}%`} />
                    <Stat label="Monthly savings ratio" value={`${(data.result.savingsRatio * 100).toFixed(1)}%`} />
                    <Stat
                      label="Estimated new EMI"
                      value={`${inr(data.result.estimatedNewEMI)}/mo (indicative ${data.result.assumedAnnualRatePct}% p.a.)`}
                    />
                  </div>
                </div>
              </div>

              <div className="card mt-6">
                <h2 className="font-display font-semibold text-ink">Score breakdown</h2>
                <div className="mt-4 space-y-4">
                  {data.result.breakdown.map((b) => (
                    <div key={b.key}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-ink">{b.label}</span>
                        <span className="text-ink/50">
                          {b.score} / {b.weight}
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-nest-100">
                        <div
                          className="h-full rounded-full bg-nest-500"
                          style={{ width: `${(b.score / b.weight) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-ink/50">{b.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card mt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-nestwarm-500" size={18} />
                  <h2 className="font-display font-semibold text-ink">What would improve this</h2>
                </div>
                <ul className="mt-4 space-y-2">
                  {data.result.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2 text-sm text-ink/70">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-nest-400" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
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
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
