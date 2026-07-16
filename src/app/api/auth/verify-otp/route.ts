import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { otpSchema } from "@/lib/validation";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { logAudit, rateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`otp:${ip}`, 8, 60_000)) {
    return NextResponse.json({ error: "Too many OTP attempts. Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = otpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code sent to you." }, { status: 400 });
  }
  const { email, code } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.otpCode || !user.otpExpiresAt) {
    return NextResponse.json({ error: "No pending verification for this account." }, { status: 400 });
  }
  if (user.otpExpiresAt < new Date()) {
    return NextResponse.json({ error: "OTP expired. Please sign up again or request a new code." }, { status: 400 });
  }
  if (user.otpCode !== code) {
    await logAudit(user.id, "OTP_FAILED");
    return NextResponse.json({ error: "Incorrect code." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, otpCode: null, otpExpiresAt: null },
  });

  const token = await createSessionToken({ userId: user.id, role: user.role, email: user.email });
  await setSessionCookie(token);
  await logAudit(user.id, "OTP_VERIFIED");

  return NextResponse.json({ ok: true, role: user.role });
}
