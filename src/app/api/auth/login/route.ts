import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { logAudit, rateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`login:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many login attempts. Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (user.isDisabled) {
    return NextResponse.json({ error: "This account has been disabled. Contact support." }, { status: 403 });
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    await logAudit(user.id, "LOGIN_FAILED");
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  if (!user.isVerified) {
    return NextResponse.json(
      { error: "Account not verified. Please complete OTP verification.", needsOtp: true, email: user.email },
      { status: 403 }
    );
  }

  const token = await createSessionToken({ userId: user.id, role: user.role, email: user.email });
  await setSessionCookie(token);
  await logAudit(user.id, "LOGIN_SUCCESS");

  return NextResponse.json({ ok: true, role: user.role, name: user.name });
}
