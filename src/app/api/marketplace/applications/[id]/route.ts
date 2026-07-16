import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { applicationStatusUpdateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/security";
import { allowedNextStatuses, type ApplicationStatus } from "@/lib/marketplace";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const application = await prisma.loanApplication.findUnique({
    where: { id: params.id },
    include: { offer: true },
  });
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = applicationStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { status, lenderNote } = parsed.data;

  const isOwnerBorrower = session.userId === application.borrowerUserId;
  const isOwnerLender = session.userId === application.offer.lenderUserId;
  const isAdmin = session.role === "ADMIN";

  if (status === "WITHDRAWN") {
    if (!isOwnerBorrower && !isAdmin) {
      return NextResponse.json({ error: "Only the applicant can withdraw an application." }, { status: 403 });
    }
  } else if (!isOwnerLender && !isAdmin) {
    return NextResponse.json({ error: "Only the offer's lender can update this application's status." }, { status: 403 });
  }

  const allowed = allowedNextStatuses(application.status as ApplicationStatus);
  if (status !== "WITHDRAWN" && !allowed.includes(status)) {
    return NextResponse.json({ error: `Cannot move an application from ${application.status} to ${status}.` }, { status: 400 });
  }

  const updated = await prisma.loanApplication.update({
    where: { id: params.id },
    data: { status, lenderNote: lenderNote || undefined },
  });

  await logAudit(session.userId, "MARKETPLACE_APPLICATION_STATUS_CHANGED", `id=${params.id} status=${status}`);

  return NextResponse.json({ ok: true, application: updated });
}
