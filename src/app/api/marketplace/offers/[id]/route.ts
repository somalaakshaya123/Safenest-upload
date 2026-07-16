import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/security";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const offer = await prisma.loanOffer.findUnique({ where: { id: params.id } });
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  if (session.role === "LENDER" && offer.lenderUserId === session.userId) {
    const applications = await prisma.loanApplication.findMany({
      where: { offerId: offer.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ offer, applications });
  }

  if (offer.status !== "ACTIVE" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "This offer is not currently available." }, { status: 404 });
  }

  return NextResponse.json({ offer });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const offer = await prisma.loanOffer.findUnique({ where: { id: params.id } });
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (offer.lenderUserId !== session.userId) {
    return NextResponse.json({ error: "You can only edit your own offers." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const status = body?.status;
  if (!["ACTIVE", "PAUSED"].includes(status)) {
    return NextResponse.json({ error: "Lenders may only set status to ACTIVE or PAUSED. Removal is admin-only." }, { status: 400 });
  }

  const updated = await prisma.loanOffer.update({ where: { id: params.id }, data: { status } });
  await logAudit(session.userId, "MARKETPLACE_OFFER_STATUS_CHANGED", `id=${params.id} status=${status}`);

  return NextResponse.json({ ok: true, offer: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const offer = await prisma.loanOffer.findUnique({ where: { id: params.id } });
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (offer.lenderUserId !== session.userId) {
    return NextResponse.json({ error: "You can only delete your own offers." }, { status: 403 });
  }

  await prisma.loanApplication.deleteMany({ where: { offerId: params.id } });
  await prisma.loanOffer.delete({ where: { id: params.id } });
  await logAudit(session.userId, "MARKETPLACE_OFFER_DELETED", `id=${params.id}`);

  return NextResponse.json({ ok: true });
}
