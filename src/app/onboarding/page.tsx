"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  IndianRupee,
  Target,
  ShieldCheck,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

type EmploymentType = "SALARIED" | "SELF_EMPLOYED" | "BUSINESS_OWNER" | "STUDENT" | "UNEMPLOYED";
type LoanPurpose = "HOME" | "VEHICLE" | "EDUCATION" | "BUSINESS" | "PERSONAL" | "AGRICULTURE" | "MEDICAL" | "OTHER";

type FormState = {
  employmentType: EmploymentType | "";
  ageBand: string;
  dependents: string;
  state: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  existingEMIs: string;
  loanPurpose: LoanPurpose | "";
  desiredLoanAmount: string;
  desiredTenureMonths: string;
  hasExistingLoanDefault: boolean;
  preferredLanguage: string;
};

const EMPTY_FORM: FormState = {
  employmentType: "",
  ageBand: "",
  dependents: "0",
  state: "",
  monthlyIncome: "",
  monthlyExpenses: "",
  existingEMIs: "0",
  loanPurpose: "",
  desiredLoanAmount: "",
  desiredTenureMonths: "",
  hasExistingLoanDefault: false,
  preferredLanguage: "en",
};

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: "SALARIED", label: "Salaried" },
  { value: "SELF_EMPLOYED", label: "Self-employed" },
  { value: "BUSINESS_OWNER", label: "Business owner" },
  { value: "STUDENT", label: "Student" },
  { value: "UNEMPLOYED", label: "Unemployed" },
];

const AGE_BANDS = ["18-25", "26-35", "36-45", "46-60", "60+"];

const LOAN_PURPOSE_OPTIONS: { value: LoanPurpose; label: string }[] = [
  { value: "HOME", label: "Home" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "EDUCATION", label: "Education" },
  { value: "BUSINESS", label: "Business" },
  { value: "PERSONAL", label: "Personal" },
  { value: "AGRICULTURE", label: "Agriculture" },
  { value: "MEDICAL", label: "Medical" },
  { value: "OTHER", label: "Other" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "en-simple", label: "Simple English" },
  { value: "ta", label: "தமிழ் (Tamil)" },
  { value: "hi", label: "हिन्दी (Hindi)" },
  { value: "te", label: "తెలుగు (Telugu)" },
  { value: "ml", label: "മലയാളം (Malayalam)" },
];

const STEPS = [
  { title: "Employment & household", icon: Briefcase },
  { title: "Income & expenses", icon: IndianRupee },
  { title: "Loan goal", icon: Target },
  { title: "Declarations", icon: ShieldCheck },
  { title: "Review & submit", icon: ClipboardCheck },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        if (data.configured) {
          setForm({
            employmentType: data.employmentType ?? "",
            ageBand: data.ageBand ?? "",
            dependents: String(data.dependents ?? "0"),
            state: data.state ?? "",
            monthlyIncome: String(data.monthlyIncome ?? ""),
            monthlyExpenses: String(data.monthlyExpenses ?? ""),
            existingEMIs: String(data.existingEMIs ?? "0"),
            loanPurpose: data.loanPurpose ?? "",
            desiredLoanAmount: String(data.desiredLoanAmount ?? ""),
            desiredTenureMonths: String(data.desiredTenureMonths ?? ""),
            hasExistingLoanDefault: !!data.hasExistingLoanDefault,
            preferredLanguage: data.preferredLanguage ?? "en",
          });
        }
      })
      .finally(() => setLoadingExisting(false));
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function stepIsValid(i: number): boolean {
    switch (i) {
      case 0:
        return !!form.employmentType && form.dependents !== "";
      case 1:
        return form.monthlyIncome !== "" && form.monthlyExpenses !== "" && form.existingEMIs !== "";
      case 2:
        return !!form.loanPurpose && form.desiredLoanAmount !== "" && form.desiredTenureMonths !== "";
      case 3:
        return !!form.preferredLanguage;
      default:
        return true;
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employmentType: form.employmentType,
        ageBand: form.ageBand || undefined,
        dependents: form.dependents,
        state: form.state,
        monthlyIncome: form.monthlyIncome,
        monthlyExpenses: form.monthlyExpenses,
        existingEMIs: form.existingEMIs,
        loanPurpose: form.loanPurpose,
        desiredLoanAmount: form.desiredLoanAmount,
        desiredTenureMonths: form.desiredTenureMonths,
        hasExistingLoanDefault: form.hasExistingLoanDefault,
        preferredLanguage: form.preferredLanguage,
      }),
    });
    const data = await res.json().catch(() => null);
    setSubmitting(false);

    if (!res.ok) {
      setError(data?.error ?? "Something went wrong saving your profile. Please check your entries.");
      return;
    }
    router.push("/financial-health");
  }

  const current = STEPS[step];

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-2xl font-bold text-ink">Financial profile</h1>
          <p className="mt-1 text-sm text-ink/60">
            A few questions about your situation. This feeds a deterministic, rule-based Financial Health
            score — no AI is used anywhere in this step.
          </p>

          {/* Step indicator */}
          <div className="mt-6 flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition ${
                    i < step
                      ? "border-nest-500 bg-nest-500 text-white"
                      : i === step
                      ? "border-nest-500 text-nest-600"
                      : "border-nest-200 text-ink/30"
                  }`}
                >
                  <s.icon size={16} />
                </div>
                <span className={`hidden text-center text-[11px] font-medium sm:block ${i === step ? "text-nest-700" : "text-ink/40"}`}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>

          <div className="card mt-6">
            {loadingExisting ? (
              <div className="flex items-center justify-center gap-2 py-10 text-ink/50">
                <Loader2 className="animate-spin" size={18} /> Loading…
              </div>
            ) : (
              <>
                <h2 className="font-display font-semibold text-ink">{current.title}</h2>

                {step === 0 && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="label">Employment type</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {EMPLOYMENT_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => update("employmentType", o.value)}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              form.employmentType === o.value
                                ? "border-nest-500 bg-nest-100 text-nest-700"
                                : "border-nest-200 text-ink/60"
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">Age band (optional)</label>
                      <div className="grid grid-cols-5 gap-2">
                        {AGE_BANDS.map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => update("ageBand", form.ageBand === a ? "" : a)}
                            className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                              form.ageBand === a ? "border-nest-500 bg-nest-100 text-nest-700" : "border-nest-200 text-ink/60"
                            }`}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Number of dependents</label>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          className="input"
                          value={form.dependents}
                          onChange={(e) => update("dependents", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">State (optional)</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. Tamil Nadu"
                          value={form.state}
                          onChange={(e) => update("state", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="label">Monthly income (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        placeholder="e.g. 35000"
                        value={form.monthlyIncome}
                        onChange={(e) => update("monthlyIncome", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Monthly household expenses (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        placeholder="e.g. 18000"
                        value={form.monthlyExpenses}
                        onChange={(e) => update("monthlyExpenses", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Existing monthly EMIs, total (₹)</label>
                      <input
                        type="number"
                        min={0}
                        className="input"
                        placeholder="0 if none"
                        value={form.existingEMIs}
                        onChange={(e) => update("existingEMIs", e.target.value)}
                      />
                      <p className="mt-1 text-xs text-ink/40">Include all current loan/credit-card EMIs combined.</p>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="label">What is this loan for?</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {LOAN_PURPOSE_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => update("loanPurpose", o.value)}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              form.loanPurpose === o.value
                                ? "border-nest-500 bg-nest-100 text-nest-700"
                                : "border-nest-200 text-ink/60"
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Desired loan amount (₹)</label>
                        <input
                          type="number"
                          min={1}
                          className="input"
                          placeholder="e.g. 500000"
                          value={form.desiredLoanAmount}
                          onChange={(e) => update("desiredLoanAmount", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label">Desired tenure (months)</label>
                        <input
                          type="number"
                          min={1}
                          max={480}
                          className="input"
                          placeholder="e.g. 60"
                          value={form.desiredTenureMonths}
                          onChange={(e) => update("desiredTenureMonths", e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-ink/40">
                      The EMI shown later is estimated using an indicative planning rate for this loan type — not a
                      real offer from any lender.
                    </p>
                  </div>
                )}

                {step === 3 && (
                  <div className="mt-4 space-y-5">
                    <div>
                      <label className="label">Have you ever defaulted on a loan or credit card?</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => update("hasExistingLoanDefault", false)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            !form.hasExistingLoanDefault ? "border-nest-500 bg-nest-100 text-nest-700" : "border-nest-200 text-ink/60"
                          }`}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => update("hasExistingLoanDefault", true)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            form.hasExistingLoanDefault ? "border-nest-500 bg-nest-100 text-nest-700" : "border-nest-200 text-ink/60"
                          }`}
                        >
                          Yes
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-ink/40">Self-reported, used only to inform your score and tips.</p>
                    </div>
                    <div>
                      <label className="label">Preferred language for explanations</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {LANGUAGE_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => update("preferredLanguage", o.value)}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              form.preferredLanguage === o.value
                                ? "border-nest-500 bg-nest-100 text-nest-700"
                                : "border-nest-200 text-ink/60"
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="mt-4 space-y-2 text-sm">
                    <SummaryRow label="Employment" value={form.employmentType.replace("_", " ")} />
                    <SummaryRow label="Age band" value={form.ageBand || "Not provided"} />
                    <SummaryRow label="Dependents" value={form.dependents} />
                    <SummaryRow label="State" value={form.state || "Not provided"} />
                    <SummaryRow label="Monthly income" value={`₹${form.monthlyIncome || "0"}`} />
                    <SummaryRow label="Monthly expenses" value={`₹${form.monthlyExpenses || "0"}`} />
                    <SummaryRow label="Existing EMIs" value={`₹${form.existingEMIs || "0"}`} />
                    <SummaryRow label="Loan purpose" value={form.loanPurpose} />
                    <SummaryRow label="Desired amount" value={`₹${form.desiredLoanAmount || "0"}`} />
                    <SummaryRow label="Desired tenure" value={`${form.desiredTenureMonths || "0"} months`} />
                    <SummaryRow label="Prior default" value={form.hasExistingLoanDefault ? "Yes" : "No"} />
                    <SummaryRow
                      label="Language"
                      value={LANGUAGE_OPTIONS.find((l) => l.value === form.preferredLanguage)?.label ?? "English"}
                    />
                    <p className="pt-2 text-xs text-ink/40">
                      Submitting runs the deterministic Financial Health scoring engine on these numbers — nothing
                      here is sent to any AI provider.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
                )}

                <div className="mt-6 flex gap-3">
                  {step > 0 && (
                    <button type="button" onClick={() => setStep((s) => s - 1)} className="btn-secondary">
                      <ChevronLeft size={16} /> Back
                    </button>
                  )}
                  {step < STEPS.length - 1 ? (
                    <button
                      type="button"
                      disabled={!stepIsValid(step)}
                      onClick={() => setStep((s) => s + 1)}
                      className="btn-primary flex-1"
                    >
                      Continue <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button type="button" disabled={submitting} onClick={handleSubmit} className="btn-primary flex-1">
                      {submitting ? "Calculating…" : "See my Financial Health score"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-nest-100 py-1.5 last:border-0">
      <span className="text-ink/50">{label}</span>
      <span className="font-medium capitalize text-ink">{value}</span>
    </div>
  );
}
