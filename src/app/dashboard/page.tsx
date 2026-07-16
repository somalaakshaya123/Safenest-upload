import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CheckCircle2, Circle, Settings, HeartPulse, Landmark, HandCoins } from "lucide-react";
import Link from "next/link";
import ScoreGauge from "@/components/ScoreGauge";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const aiSettings = await prisma.aISettings.findUnique({ where: { ownerUserId: session.userId } });
  const financialProfile = await prisma.financialProfile.findUnique({ where: { ownerUserId: session.userId } });
  const loanDocCount = await prisma.loanDocument.count({ where: { ownerUserId: session.userId } });

  if (!user) redirect("/login");

  const steps = [
    { label: "Account created & verified", done: true },
    { label: "AI configuration (BYOK)", done: !!aiSettings, href: "/settings/ai" },
    {
      label: "Persona & financial profile",
      done: !!financialProfile,
      href: financialProfile ? "/financial-health" : "/onboarding",
    },
    { label: "Loan document analysis", done: loanDocCount > 0, href: "/loans" },
    { label: "Recommendations & schemes", done: !!financialProfile, href: "/schemes" },
    { label: "Borrower–Lender Marketplace", done: true, href: "/marketplace" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-ink">Welcome, {user.name.split(" ")[0]} 👋</h1>
      <p className="mt-1 text-ink/60">
        You're signed in as a <strong>{user.role.toLowerCase()}</strong>. Here's your setup progress.
      </p>

      {!aiSettings && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-nestwarm-400/40 bg-nestwarm-50 px-5 py-4">
          <div>
            <p className="font-semibold text-nestwarm-700">AI not configured yet</p>
            <p className="text-sm text-nestwarm-600">
              Add your own LLM API key to unlock loan document analysis in later phases.
            </p>
          </div>
          <Link href="/settings/ai" className="btn-primary !px-4 !py-2 text-sm">
            <Settings size={16} /> Configure
          </Link>
        </div>
      )}

      {!financialProfile ? (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-nest-200 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <HeartPulse className="text-nest-500" size={22} />
            <div>
              <p className="font-semibold text-ink">Financial profile not started</p>
              <p className="text-sm text-ink/60">
                Answer a short questionnaire to get your rule-based Financial Health score.
              </p>
            </div>
          </div>
          <Link href="/onboarding" className="btn-primary !px-4 !py-2 text-sm">
            Start
          </Link>
        </div>
      ) : (
        <Link
          href="/financial-health"
          className="card mt-6 flex items-center justify-between gap-4 transition hover:shadow-cardHover"
        >
          <div className="flex items-center gap-4">
            <ScoreGauge score={financialProfile.score} band={financialProfile.band} size={96} />
            <div>
              <p className="font-semibold text-ink">Financial Health: {financialProfile.band}</p>
              <p className="text-sm text-ink/60">Score {financialProfile.score}/100 · rule-based, not AI. Tap to view the full breakdown.</p>
            </div>
          </div>
        </Link>
      )}

      {financialProfile && (
        <Link
          href="/schemes"
          className="card mt-4 flex items-center gap-4 transition hover:shadow-cardHover"
        >
          <Landmark className="text-nest-500" size={28} />
          <div>
            <p className="font-semibold text-ink">Recommendations &amp; government schemes</p>
            <p className="text-sm text-ink/60">Rule-based scheme matches and lender comparisons based on your profile.</p>
          </div>
        </Link>
      )}

      <Link
        href="/marketplace"
        className="card mt-4 flex items-center gap-4 transition hover:shadow-cardHover"
      >
        <HandCoins className="text-nestwarm-500" size={28} />
        <div>
          <p className="font-semibold text-ink">Borrower–Lender Marketplace</p>
          <p className="text-sm text-ink/60">
            {user.role === "LENDER"
              ? "Post loan offers and review borrower applications."
              : "Browse lender offers matched to your financial profile and apply."}
          </p>
        </div>
      </Link>

      <div className="card mt-6">
        <h2 className="font-display font-semibold text-ink">Build roadmap</h2>
        <ul className="mt-4 space-y-3">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center justify-between">
              <span className="flex items-center gap-3 text-sm text-ink/80">
                {s.done ? <CheckCircle2 className="text-nest-500" size={20} /> : <Circle className="text-ink/20" size={20} />}
                {s.label}
              </span>
              {s.href && !s.done && (
                <Link href={s.href} className="text-xs font-semibold text-nest-600">Set up →</Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
