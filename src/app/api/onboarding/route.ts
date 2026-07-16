import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { onboardingSchema } from "@/lib/validation";
import { logAudit } from "@/lib/security";
import { computeFinancialHealth, type FinancialInputs } from "@/lib/scoring";

function serialize(profile: NonNullable<Awaited<ReturnType<typeof prisma.financialProfile.findUnique>>>) {
  return {
    employmentType: profile.employmentType,
    ageBand: profile.ageBand,
    dependents: profile.dependents,
    state: profile.state,
    monthlyIncome: profile.monthlyIncome,
    monthlyExpenses: profile.monthlyExpenses,
    existingEMIs: profile.existingEMIs,
    loanPurpose: profile.loanPurpose,
    desiredLoanAmount: profile.desiredLoanAmount,
    desiredTenureMonths: profile.desiredTenureMonths,
    hasExistingLoanDefault: profile.hasExistingLoanDefault,
    preferredLanguage: profile.preferredLanguage,
    result: {
      score: profile.score,
      band: profile.band,
      dtiRatio: profile.dtiRatio,
      emiBurdenRatio: profile.emiBurdenRatio,
      savingsRatio: profile.savingsRatio,
      estimatedNewEMI: profile.estimatedNewEMI,
      assumedAnnualRatePct: profile.assumedAnnualRatePct,
      breakdown: JSON.parse(profile.breakdownJson),
      recommendations: JSON.parse(profile.recommendationsJson),
    },
    updatedAt: profile.updatedAt,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await prisma.financialProfile.findUnique({ where: { ownerUserId: session.userId } });
  if (!profile) return NextResponse.json({ configured: false });

  return NextResponse.json({ configured: true, ...serialize(profile) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Deterministic rule-based scoring — no AI/BYOK key is used here.
  const inputs: FinancialInputs = {
    employmentType: data.employmentType,
    ageBand: data.ageBand,
    dependents: data.dependents,
    state: data.state,
    monthlyIncome: data.monthlyIncome,
    monthlyExpenses: data.monthlyExpenses,
    existingEMIs: data.existingEMIs,
    loanPurpose: data.loanPurpose,
    desiredLoanAmount: data.desiredLoanAmount,
    desiredTenureMonths: data.desiredTenureMonths,
    hasExistingLoanDefault: data.hasExistingLoanDefault,
    preferredLanguage: data.preferredLanguage,
  };
  const result = computeFinancialHealth(inputs);

  const saved = await prisma.financialProfile.upsert({
    where: { ownerUserId: session.userId },
    update: {
      employmentType: data.employmentType,
      ageBand: data.ageBand || null,
      dependents: data.dependents,
      state: data.state || null,
      monthlyIncome: data.monthlyIncome,
      monthlyExpenses: data.monthlyExpenses,
      existingEMIs: data.existingEMIs,
      loanPurpose: data.loanPurpose,
      desiredLoanAmount: data.desiredLoanAmount,
      desiredTenureMonths: data.desiredTenureMonths,
      hasExistingLoanDefault: data.hasExistingLoanDefault,
      preferredLanguage: data.preferredLanguage,
      score: result.score,
      band: result.band,
      dtiRatio: result.dtiRatio,
      emiBurdenRatio: result.emiBurdenRatio,
      savingsRatio: result.savingsRatio,
      estimatedNewEMI: result.estimatedNewEMI,
      assumedAnnualRatePct: result.assumedAnnualRatePct,
      breakdownJson: JSON.stringify(result.breakdown),
      recommendationsJson: JSON.stringify(result.recommendations),
    },
    create: {
      ownerUserId: session.userId,
      employmentType: data.employmentType,
      ageBand: data.ageBand || null,
      dependents: data.dependents,
      state: data.state || null,
      monthlyIncome: data.monthlyIncome,
      monthlyExpenses: data.monthlyExpenses,
      existingEMIs: data.existingEMIs,
      loanPurpose: data.loanPurpose,
      desiredLoanAmount: data.desiredLoanAmount,
      desiredTenureMonths: data.desiredTenureMonths,
      hasExistingLoanDefault: data.hasExistingLoanDefault,
      preferredLanguage: data.preferredLanguage,
      score: result.score,
      band: result.band,
      dtiRatio: result.dtiRatio,
      emiBurdenRatio: result.emiBurdenRatio,
      savingsRatio: result.savingsRatio,
      estimatedNewEMI: result.estimatedNewEMI,
      assumedAnnualRatePct: result.assumedAnnualRatePct,
      breakdownJson: JSON.stringify(result.breakdown),
      recommendationsJson: JSON.stringify(result.recommendations),
    },
  });

  await logAudit(session.userId, "FINANCIAL_PROFILE_SAVED", `score=${result.score} band=${result.band}`);

  return NextResponse.json({ ok: true, ...serialize(saved) });
}
