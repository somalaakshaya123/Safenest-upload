import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { signupSchema } from "@/lib/validation";
import { generateOtp, logAudit, rateLimit, DEMO_MODE } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (!rateLimit(`signup:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many signup attempts. Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { name, email, phone, password, role, consentGiven } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const otpCode = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 10 * 60_000);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash,
      role,
      consentGiven,
      otpCode,
      otpExpiresAt,
    },
  });

  await logAudit(user.id, "SIGNUP", `role=${role}`);

  return NextResponse.json({
    ok: true,
    email: user.email,
    // DEMO_MODE surfaces the OTP directly since no SMS/email provider is
    // wired up for the hackathon. In production this field is never sent.
    demoOtp: DEMO_MODE ? otpCode : undefined,
  });
}
