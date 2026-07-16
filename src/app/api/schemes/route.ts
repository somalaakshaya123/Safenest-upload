import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { FinancialInputs } from "@/lib/scoring";
import { matchSchemes } from "@/lib/schemes";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await prisma.financialProfile.findUnique({ where: { ownerUserId: session.userId } });
  if (!profile) return NextResponse.json({ configured: false });

  // Rule-based matching only — no AI/BYOK key is used here. See src/lib/schemes.ts.
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

  const matches = matchSchemes(inputs);

  return NextResponse.json({ configured: true, loanPurpose: profile.loanPurpose, matches });
}
