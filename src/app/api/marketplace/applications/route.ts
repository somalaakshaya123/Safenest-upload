import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { loanApplicationSchema } from "@/lib/validation";
import { logAudit, rateLimit } from "@/lib/security";
import { matchOffer, type LoanOfferRecord, type OfferCategory } from "@/lib/marketplace";
import type { EmploymentType, LoanPurpose } from "@/lib/scoring";

// GET: role-aware.
//  - BORROWER: their own applications, with offer details.
//  - LENDER: applications submitted to any of their offers.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (session.role === "LENDER") {
    const applications = await prisma.loanApplication.findMany({
      where: { offer: { lenderUserId: session.userId } },
      include: { offer: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ applications });
  }

  const applications = await prisma.loanApplication.findMany({
    where: { borrowerUserId: session.userId },
    include: { offer: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ applications });
}

// POST: borrower applies to an offer. Computes and stores the deterministic
// match score at time of application for the lender's reference.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.role !== "BORROWER") {
    return NextResponse.json({ error: "Only borrower accounts can apply to marketplace offers." }, { status: 403 });
  }

  if (!rateLimit(`marketplace_apply:${session.userId}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many applications submitted recently. Please wait a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = loanApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { offerId, message } = parsed.data;

  const offer = await prisma.loanOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.status !== "ACTIVE") {
    return NextResponse.json({ error: "This offer is no longer available." }, { status: 404 });
  }

  const existing = await prisma.loanApplication.findFirst({
    where: { offerId, borrowerUserId: session.userId, status: { not: "WITHDRAWN" } },
  });
  if (existing) {
    return NextResponse.json({ error: "You've already applied to this offer." }, { status: 409 });
  }

  let matchScore: number | null = null;
  const profile = await prisma.financialProfile.findUnique({ where: { ownerUserId: session.userId } });
  if (profile) {
    const record: LoanOfferRecord = {
      ...offer,
      category: offer.category as OfferCategory,
      purposes: JSON.parse(offer.purposes) as LoanPurpose[],
      eligibleEmploymentTypes: offer.eligibleEmploymentTypes ? (JSON.parse(offer.eligibleEmploymentTypes) as EmploymentType[]) : null,
      status: offer.status as "ACTIVE" | "PAUSED" | "REMOVED",
    };
    const match = matchOffer(record, {
      employmentType: profile.employmentType as EmploymentType,
      ageBand: profile.ageBand ?? undefined,
      dependents: profile.dependents,
      state: profile.state ?? undefined,
      monthlyIncome: profile.monthlyIncome,
      monthlyExpenses: profile.monthlyExpenses,
      existingEMIs: profile.existingEMIs,
      loanPurpose: profile.loanPurpose as LoanPurpose,
      desiredLoanAmount: profile.desiredLoanAmount,
      desiredTenureMonths: profile.desiredTenureMonths,
      hasExistingLoanDefault: profile.hasExistingLoanDefault,
    });
    matchScore = match.matchScore;
  }

  const application = await prisma.loanApplication.create({
    data: {
      offerId,
      borrowerUserId: session.userId,
      message: message || null,
      matchScore,
    },
  });

  await logAudit(session.userId, "MARKETPLACE_APPLICATION_SUBMITTED", `offerId=${offerId} applicationId=${application.id}`);

  return NextResponse.json({ ok: true, id: application.id });
}
