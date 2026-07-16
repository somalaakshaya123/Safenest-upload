import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { FinancialHealthResult, FinancialInputs, LoanPurpose } from "@/lib/scoring";
import { matchSchemes } from "@/lib/schemes";
import { buildLoanComparison, type AnalyzedDocForComparison } from "@/lib/loanComparison";
import { buildRecommendations } from "@/lib/recommendations";
import type { ExtractedLoanFields } from "@/lib/ai/loanExtraction";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await prisma.financialProfile.findUnique({ where: { ownerUserId: session.userId } });
  if (!profile) return NextResponse.json({ configured: false });

  const inputs: FinancialInputs = {
    employmentType: profile.employmentType as FinancialInputs["employmentType"],
    ageBand: profile.ageBand ?? undefined,
    dependents: profile.dependents,
    state: profile.state ?? undefined,
    monthlyIncome: profile.monthlyIncome,
    monthlyExpenses: profile.monthlyExpenses,
    existingEMIs: profile.existingEMIs,
    loanPurpose: profile.loanPurpose as FinancialInputs["loanPurpose"],
    desiredLoanAmount: profile.desiredLoanAmount,
    desiredTenureMonths: profile.desiredTenureMonths,
    hasExistingLoanDefault: profile.hasExistingLoanDefault,
    preferredLanguage: profile.preferredLanguage,
  };

  // Re-hydrate the already-computed (Phase 2) financial health result from its cached fields —
  // no rescoring here, just reusing what src/lib/scoring.ts produced when the wizard was saved.
  const financial: FinancialHealthResult = {
    score: profile.score,
    band: profile.band as FinancialHealthResult["band"],
    dtiRatio: profile.dtiRatio,
    emiBurdenRatio: profile.emiBurdenRatio,
    savingsRatio: profile.savingsRatio,
    estimatedNewEMI: profile.estimatedNewEMI,
    assumedAnnualRatePct: profile.assumedAnnualRatePct,
    breakdown: JSON.parse(profile.breakdownJson),
    recommendations: JSON.parse(profile.recommendationsJson),
  };

  const schemeMatches = matchSchemes(inputs);

  const analyzedDocuments = await prisma.loanDocument.findMany({
    where: { ownerUserId: session.userId, status: "ANALYZED" },
    orderBy: { analyzedAt: "desc" },
  });
  const analyzedDocs: AnalyzedDocForComparison[] = analyzedDocuments
    .filter((d) => !!d.extractedJson)
    .map((d) => ({ id: d.id, title: d.title, fields: JSON.parse(d.extractedJson as string) as ExtractedLoanFields }));

  const comparisonRows = buildLoanComparison(
    profile.loanPurpose as LoanPurpose,
    profile.desiredLoanAmount,
    profile.desiredTenureMonths,
    analyzedDocs
  );

  // buildRecommendations() only sorts/re-labels output already produced by the three fixed-rule
  // engines above — see src/lib/recommendations.ts. No LLM call anywhere in this request.
  const recommendations = buildRecommendations(financial, schemeMatches, comparisonRows);

  return NextResponse.json({
    configured: true,
    financialSummary: { score: financial.score, band: financial.band },
    recommendations,
  });
}
