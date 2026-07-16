import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { adminOfferModerationSchema } from "@/lib/validation";
import { logAudit } from "@/lib/security";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = adminOfferModerationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const offer = await prisma.loanOffer.findUnique({ where: { id: params.id } });
  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

  const updated = await prisma.loanOffer.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      removedReason: parsed.data.status === "REMOVED" ? parsed.data.removedReason || "Removed by admin" : null,
    },
  });

  await logAudit(session.userId, "ADMIN_OFFER_MODERATED", `offerId=${params.id} status=${parsed.data.status}`);

  return NextResponse.json({ ok: true, offer: updated });
}
