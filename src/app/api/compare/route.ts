import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { LoanPurpose } from "@/lib/scoring";
import { buildLoanComparison, type AnalyzedDocForComparison } from "@/lib/loanComparison";
import type { ExtractedLoanFields } from "@/lib/ai/loanExtraction";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const profile = await prisma.financialProfile.findUnique({ where: { ownerUserId: session.userId } });
  if (!profile) return NextResponse.json({ configured: false });

  const analyzedDocuments = await prisma.loanDocument.findMany({
    where: { ownerUserId: session.userId, status: "ANALYZED" },
    orderBy: { analyzedAt: "desc" },
  });

  const analyzedDocs: AnalyzedDocForComparison[] = analyzedDocuments
    .filter((d) => !!d.extractedJson)
    .map((d) => ({
      id: d.id,
      title: d.title,
      fields: JSON.parse(d.extractedJson as string) as ExtractedLoanFields,
    }));

  // Deterministic arithmetic only from here — see src/lib/loanComparison.ts. The AI-extracted
  // numbers in analyzedDocs were produced earlier by Phase 3's BYOK-powered extraction; no LLM
  // call happens in this request.
  const rows = buildLoanComparison(
    profile.loanPurpose as LoanPurpose,
    profile.desiredLoanAmount,
    profile.desiredTenureMonths,
    analyzedDocs
  );

  return NextResponse.json({
    configured: true,
    loanPurpose: profile.loanPurpose,
    desiredLoanAmount: profile.desiredLoanAmount,
    desiredTenureMonths: profile.desiredTenureMonths,
    rows,
  });
}
