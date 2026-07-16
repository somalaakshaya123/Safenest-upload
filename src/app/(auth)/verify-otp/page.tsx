"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";

export default function VerifyOtpPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const demoOtp = params.get("demoOtp");

  const [code, setCode] = useState(demoOtp ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Verification failed.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-nest-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Logo size={48} /></div>
        <div className="card">
          <h1 className="font-display text-xl font-bold text-ink">Verify your account</h1>
          <p className="mt-1 text-sm text-ink/60">Enter the 6-digit code sent to {email || "your account"}.</p>

          {demoOtp && (
            <div className="mt-4 rounded-lg border border-nestwarm-400/40 bg-nestwarm-50 px-3 py-2 text-xs text-nestwarm-600">
              <strong>Demo mode:</strong> no SMS/email provider is wired up for judging, so your code is
              pre-filled here: <strong>{demoOtp}</strong>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Verification code</label>
              <input
                className="input text-center text-lg tracking-[0.5em]"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Verifying…" : "Verify & continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
