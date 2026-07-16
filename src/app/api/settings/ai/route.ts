import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { aiSettingsSchema } from "@/lib/validation";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/crypto";
import { logAudit } from "@/lib/security";
import { testAIConnection } from "@/lib/ai/client";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const settings = await prisma.aISettings.findUnique({ where: { ownerUserId: session.userId } });
  if (!settings) return NextResponse.json({ configured: false });

  return NextResponse.json({
    configured: true,
    provider: settings.provider,
    baseUrl: settings.baseUrl,
    model: settings.model,
    maskedApiKey: maskSecret(decryptSecret(settings.encryptedApiKey)),
    lastTestedAt: settings.lastTestedAt,
    lastTestStatus: settings.lastTestStatus,
    lastTestMessage: settings.lastTestMessage,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = aiSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { provider, baseUrl, model, apiKey } = parsed.data;

  if (provider === "openai_compatible" && !baseUrl) {
    return NextResponse.json(
      { error: "baseUrl is required when provider is 'openai_compatible'." },
      { status: 400 }
    );
  }

  const encryptedApiKey = encryptSecret(apiKey);

  const saved = await prisma.aISettings.upsert({
    where: { ownerUserId: session.userId },
    update: { provider, baseUrl: baseUrl || null, model, encryptedApiKey },
    create: { ownerUserId: session.userId, provider, baseUrl: baseUrl || null, model, encryptedApiKey },
  });

  await logAudit(session.userId, "AI_SETTINGS_UPDATED", `provider=${provider} model=${model}`);

  return NextResponse.json({
    ok: true,
    provider: saved.provider,
    model: saved.model,
    maskedApiKey: maskSecret(apiKey),
  });
}

// Test the currently saved BYOK configuration end-to-end against the real provider.
export async function PUT() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const settings = await prisma.aISettings.findUnique({ where: { ownerUserId: session.userId } });
  if (!settings) {
    return NextResponse.json({ error: "No AI configuration saved yet." }, { status: 400 });
  }

  const apiKey = decryptSecret(settings.encryptedApiKey);
  const result = await testAIConnection({
    provider: settings.provider as "openai" | "anthropic" | "openai_compatible",
    model: settings.model,
    apiKey,
    baseUrl: settings.baseUrl,
  });

  await prisma.aISettings.update({
    where: { id: settings.id },
    data: {
      lastTestedAt: new Date(),
      lastTestStatus: result.ok ? "success" : "failed",
      lastTestMessage: result.message,
    },
  });

  await logAudit(session.userId, "AI_SETTINGS_TESTED", result.ok ? "success" : "failed");

  return NextResponse.json(result);
}
