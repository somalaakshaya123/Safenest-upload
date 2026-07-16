import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { adminUserUpdateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/security";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  if (params.id === session.userId) {
    return NextResponse.json({ error: "You cannot modify your own admin account from this panel." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = adminUserUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updated = await prisma.user.update({ where: { id: params.id }, data: parsed.data });

  await logAudit(
    session.userId,
    "ADMIN_USER_UPDATED",
    `targetUserId=${params.id} changes=${JSON.stringify(parsed.data)}`
  );

  return NextResponse.json({
    ok: true,
    user: { id: updated.id, isDisabled: updated.isDisabled, role: updated.role },
  });
}
