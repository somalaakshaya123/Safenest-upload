"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, HandCoins } from "lucide-react";
import Sidebar from "@/components/Sidebar";

const CATEGORIES = [
  ["PUBLIC_SECTOR_BANK", "Public Sector Bank"],
  ["PRIVATE_BANK", "Private Bank"],
  ["NBFC", "NBFC"],
  ["FINTECH", "Digital / Fintech Lender"],
  ["GOLD_LOAN", "Gold Loan"],
  ["SCHEME_LINKED", "Government Scheme-Linked"],
  ["OTHER", "Other"],
] as const;

const PURPOSES = ["HOME", "VEHICLE", "EDUCATION", "BUSINESS", "PERSONAL", "AGRICULTURE", "MEDICAL", "OTHER"] as const;
const EMPLOYMENT_TYPES = ["SALARIED", "SELF_EMPLOYED", "BUSINESS_OWNER", "STUDENT", "UNEMPLOYED"] as const;

export default function NewOfferPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    lenderDisplayName: "",
    category: "PRIVATE_BANK" as (typeof CATEGORIES)[number][0],
    purposes: [] as string[],
    minAmount: "",
    maxAmount: "",
    minTenureMonths: "",
    maxTenureMonths: "",
    interestRatePct: "",
    processingFeePct: "0",
    minIncomeRequired: "",
    eligibleEmploymentTypes: [] as string[],
    excludesIfDefault: true,
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggle(arr: string[], val: string) {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/marketplace/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      router.push("/marketplace");
    } else {
      setError(data.error || "Could not post offer. Check the form for errors.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <HandCoins className="text-nestwarm-500" /> Post a loan offer
          </h1>
          <p className="mt-1 text-ink/60">
            This listing is shown to borrowers and scored against their financial profile by a fixed rule engine
            (src/lib/marketplace.ts) — no AI is involved anywhere in the marketplace.
          </p>

          <form onSubmit={submit} className="card mt-6 space-y-5">
            {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

            <div>
              <label className="label">Offer title</label>
              <input className="input" required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Personal Loan — Salaried Professionals" />
            </div>

            <div>
              <label className="label">Lender display name</label>
              <input className="input" required maxLength={120} value={form.lenderDisplayName} onChange={(e) => setForm({ ...form, lenderDisplayName: e.target.value })} placeholder="Name shown to borrowers" />
            </div>

            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })}>
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Applicable loan purposes</label>
              <div className="flex flex-wrap gap-2">
                {PURPOSES.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setForm({ ...form, purposes: toggle(form.purposes, p) })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      form.purposes.includes(p) ? "border-nest-500 bg-nest-100 text-nest-700" : "border-nest-200 text-ink/60"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Min amount (₹)</label>
                <input type="number" className="input" required min={1000} value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} />
              </div>
              <div>
                <label className="label">Max amount (₹)</label>
                <input type="number" className="input" required min={1000} value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} />
              </div>
              <div>
                <label className="label">Min tenure (months)</label>
                <input type="number" className="input" required min={1} max={480} value={form.minTenureMonths} onChange={(e) => setForm({ ...form, minTenureMonths: e.target.value })} />
              </div>
              <div>
                <label className="label">Max tenure (months)</label>
                <input type="number" className="input" required min={1} max={480} value={form.maxTenureMonths} onChange={(e) => setForm({ ...form, maxTenureMonths: e.target.value })} />
              </div>
              <div>
                <label className="label">Interest rate (% p.a.)</label>
                <input type="number" step="0.01" className="input" required min={0} max={60} value={form.interestRatePct} onChange={(e) => setForm({ ...form, interestRatePct: e.target.value })} />
              </div>
              <div>
                <label className="label">Processing fee (%)</label>
                <input type="number" step="0.01" className="input" min={0} max={20} value={form.processingFeePct} onChange={(e) => setForm({ ...form, processingFeePct: e.target.value })} />
              </div>
              <div>
                <label className="label">Min monthly income required (optional, ₹)</label>
                <input type="number" className="input" min={0} value={form.minIncomeRequired} onChange={(e) => setForm({ ...form, minIncomeRequired: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="label">Eligible employment types (leave blank = no restriction)</label>
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setForm({ ...form, eligibleEmploymentTypes: toggle(form.eligibleEmploymentTypes, t) })}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      form.eligibleEmploymentTypes.includes(t) ? "border-nest-500 bg-nest-100 text-nest-700" : "border-nest-200 text-ink/60"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input type="checkbox" checked={form.excludesIfDefault} onChange={(e) => setForm({ ...form, excludesIfDefault: e.target.checked })} />
              Exclude applicants with an existing loan default
            </label>

            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[100px]" required minLength={20} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the offer, terms, and any conditions borrowers should know." />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? <Loader2 className="animate-spin" size={18} /> : "Post offer"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
