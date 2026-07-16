import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/security";

export async function POST() {
  const session = await getSession();
  await clearSessionCookie();
  if (session) await logAudit(session.userId, "LOGOUT");
  return NextResponse.json({ ok: true });
}
