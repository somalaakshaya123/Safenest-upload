import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const [userCount, borrowerCount, lenderCount, disabledCount, offerCount, activeOfferCount, applicationCount, loanDocCount, aiConfiguredCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "BORROWER" } }),
      prisma.user.count({ where: { role: "LENDER" } }),
      prisma.user.count({ where: { isDisabled: true } }),
      prisma.loanOffer.count(),
      prisma.loanOffer.count({ where: { status: "ACTIVE" } }),
      prisma.loanApplication.count(),
      prisma.loanDocument.count(),
      prisma.aISettings.count(),
    ]);

  return NextResponse.json({
    userCount,
    borrowerCount,
    lenderCount,
    disabledCount,
    offerCount,
    activeOfferCount,
    applicationCount,
    loanDocCount,
    aiConfiguredCount,
  });
}
