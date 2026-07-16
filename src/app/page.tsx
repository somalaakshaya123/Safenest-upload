import Link from "next/link";
import { ShieldCheck, FileSearch, Languages, Landmark, HandCoins, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";

const FEATURES = [
  {
    icon: FileSearch,
    title: "Loan Document Analyzer",
    desc: "Paste or upload a loan document and get a plain-language breakdown of every fee, penalty, and clause — with a transparent Safe / Moderate / High risk rating.",
  },
  {
    icon: ShieldCheck,
    title: "Financial Health Score",
    desc: "A clear, explainable score built from your income, expenses, savings and EMIs — every number shown, nothing hidden.",
  },
  {
    icon: Landmark,
    title: "Government Scheme Matching",
    desc: "Discover schemes you actually qualify for — for students, women, farmers, first graduates, and small business owners.",
  },
  {
    icon: HandCoins,
    title: "Borrower–Lender Marketplace",
    desc: "A safer way to discover credit — compare real terms side by side before you ever sign anything.",
  },
];

const LANGUAGES = ["English", "Simple English", "தமிழ் Tamil", "हिंदी Hindi", "తెలుగు Telugu", "മലയാളം Malayalam"];

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-nest-100 px-3 py-1 text-xs font-semibold text-nest-700">
                <Lock size={14} /> Built to stop predatory lending
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
                Understand every loan before you sign it.
              </h1>
              <p className="mt-5 text-lg text-ink/70">
                SafeNest AI turns confusing loan paperwork into plain language, scores your financial
                health transparently, and steers you away from debt traps — in the language you're
                comfortable with.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/signup?role=BORROWER" className="btn-primary">
                  I'm a borrower
                </Link>
                <Link href="/signup?role=LENDER" className="btn-secondary">
                  I'm a lender
                </Link>
              </div>
              <p className="mt-4 text-xs text-ink/50">
                Every AI-powered feature runs on your own API key (BYOK) — configured in-app, never hardcoded.
              </p>
            </div>
            <div className="card flex flex-col items-center gap-4 !p-10">
              <img src="/logo.png" alt="SafeNest AI" className="h-40 w-40 rounded-2xl object-contain" />
              <p className="text-center text-sm text-ink/60">
                A safe nest for every financial decision.
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-nest-100 bg-white py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">What SafeNest AI does</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="card">
                  <f.icon className="text-nest-500" size={28} />
                  <h3 className="mt-4 font-display font-semibold text-ink">{f.title}</h3>
                  <p className="mt-2 text-sm text-ink/60">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="languages" className="py-20">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">Speaks your language</h2>
            <p className="mt-3 text-ink/60">Every result — scores, risk summaries, recommendations — available in:</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {LANGUAGES.map((l) => (
                <span key={l} className="rounded-full border border-nest-200 bg-white px-4 py-2 text-sm font-medium text-nest-700">
                  {l}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="trust" className="border-t border-nest-100 bg-nest-900 py-20 text-white">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-display text-2xl font-bold md:text-3xl">Built with security first</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 text-sm text-white/70">
              <p>🔒 Passwords hashed with bcrypt, never stored in plain text.</p>
              <p>🔑 Bring-your-own AI key — encrypted at rest, never hardcoded.</p>
              <p>🧾 Every sensitive action is audit-logged.</p>
              <p>🛡️ OTP verification and rate-limited login/OTP attempts.</p>
              <p>✅ Server-side validation on every form (Zod).</p>
              <p>👁️ Transparent, explainable scoring — never a black box.</p>
            </div>
          </div>
        </section>
      </main>
      <footer className="bg-nest-950 py-8 text-center text-xs text-white/40 bg-ink">
        SafeNest AI — built for System Siege. Demo mode active for judging.
      </footer>
    </>
  );
}
