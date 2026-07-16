import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { loanOfferSchema } from "@/lib/validation";
import { logAudit } from "@/lib/security";
import { matchOffers, type LoanOfferRecord, type OfferCategory } from "@/lib/marketplace";
import type { EmploymentType, LoanPurpose } from "@/lib/scoring";

function toRecord(o: {
  id: string;
  lenderUserId: string;
  title: string;
  lenderDisplayName: string;
  category: string;
  purposes: string;
  minAmount: number;
  maxAmount: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  interestRatePct: number;
  processingFeePct: number;
  minIncomeRequired: number | null;
  eligibleEmploymentTypes: string | null;
  excludesIfDefault: boolean;
  description: string;
  status: string;
  removedReason: string | null;
  createdAt: Date;
}): LoanOfferRecord {
  return {
    ...o,
    category: o.category as OfferCategory,
    purposes: JSON.parse(o.purposes) as LoanPurpose[],
    eligibleEmploymentTypes: o.eligibleEmploymentTypes ? (JSON.parse(o.eligibleEmploymentTypes) as EmploymentType[]) : null,
    status: o.status as "ACTIVE" | "PAUSED" | "REMOVED",
  };
}

// GET: role-aware.
//  - LENDER: their own offers (any status), newest first.
//  - BORROWER/ADMIN: active offers only, matched + scored against the
//    caller's FinancialProfile if one exists (deterministic — src/lib/marketplace.ts).
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const mine = req.nextUrl.searchParams.get("mine") === "1";

  if (session.role === "LENDER" && mine) {
    const offers = await prisma.loanOffer.findMany({
      where: { lenderUserId: session.userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { applications: true } } },
    });
    return NextResponse.json({ offers: offers.map((o) => ({ ...toRecord(o), applicationCount: o._count.applications })) });
  }

  const offers = await prisma.loanOffer.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  const records = offers.map(toRecord);

  const profile = await prisma.financialProfile.findUnique({ where: { ownerUserId: session.userId } });
  if (!profile) {
    return NextResponse.json({ offers: records, matches: null, profileMissing: true });
  }

  const matches = matchOffers(records, {
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

  return NextResponse.json({ offers: records, matches, profileMissing: false });
}

// POST: create a new offer. LENDER role only.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (session.role !== "LENDER") {
    return NextResponse.json({ error: "Only lender accounts can post marketplace offers." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = loanOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const offer = await prisma.loanOffer.create({
    data: {
      lenderUserId: session.userId,
      title: d.title,
      lenderDisplayName: d.lenderDisplayName,
      category: d.category,
      purposes: JSON.stringify(d.purposes),
      minAmount: d.minAmount,
      maxAmount: d.maxAmount,
      minTenureMonths: d.minTenureMonths,
      maxTenureMonths: d.maxTenureMonths,
      interestRatePct: d.interestRatePct,
      processingFeePct: d.processingFeePct,
      minIncomeRequired: d.minIncomeRequired === "" || d.minIncomeRequired === undefined ? null : d.minIncomeRequired,
      eligibleEmploymentTypes: d.eligibleEmploymentTypes && d.eligibleEmploymentTypes.length > 0 ? JSON.stringify(d.eligibleEmploymentTypes) : null,
      excludesIfDefault: d.excludesIfDefault,
      description: d.description,
    },
  });

  await logAudit(session.userId, "MARKETPLACE_OFFER_CREATED", `id=${offer.id} title=${d.title}`);

  return NextResponse.json({ ok: true, id: offer.id });
}
