"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

export default function SignupPage() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultRole = params.get("role") === "LENDER" ? "LENDER" : "BORROWER";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: defaultRole,
    consentGiven: false,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setServerError("");
    setErrors({});

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (data.details) setErrors(data.details);
      setServerError(data.error ?? "Something went wrong.");
      return;
    }

    const query = new URLSearchParams({ email: data.email });
    if (data.demoOtp) query.set("demoOtp", data.demoOtp);
    router.push(`/verify-otp?${query.toString()}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-nest-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo size={48} /></div>
        <div className="card">
          <h1 className="font-display text-xl font-bold text-ink">Create your account</h1>
          <p className="mt-1 text-sm text-ink/60">Start with a secure, private profile.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="flex gap-2 rounded-lg bg-nest-100 p-1">
              {(["BORROWER", "LENDER"] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setForm({ ...form, role: r })}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                    form.role === r ? "bg-white text-nest-700 shadow" : "text-ink/50"
                  }`}
                >
                  {r === "BORROWER" ? "Borrower" : "Lender"}
                </button>
              ))}
            </div>

            <div>
              <label className="label">Full name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email[0]}</p>}
            </div>
            <div>
              <label className="label">Phone (optional)</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit number" />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone[0]}</p>}
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password[0]}</p>}
            </div>
            <label className="flex items-start gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.consentGiven}
                onChange={(e) => setForm({ ...form, consentGiven: e.target.checked })}
              />
              I consent to SafeNest AI processing my financial data to generate my risk score and recommendations.
            </label>

            {serverError && <p className="text-sm text-red-600">{serverError}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink/60">
            Already have an account? <Link href="/login" className="font-semibold text-nest-600">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
