import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { loanAnalysisSchema } from "@/lib/validation";
import { decryptSecret } from "@/lib/crypto";
import { logAudit, rateLimit } from "@/lib/security";
import { extractLoanFields, AIConfigError, AIProviderError } from "@/lib/ai/loanExtraction";
import { computeLoanRisk } from "@/lib/riskEngine";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const docs = await prisma.loanDocument.findMany({
    where: { ownerUserId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      riskScore: true,
      riskBand: true,
      aiProvider: true,
      aiModel: true,
      createdAt: true,
      analyzedAt: true,
    },
  });

  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Loan analysis makes a real, billed call against the user's own key —
  // rate-limit per user to avoid runaway costs from accidental double-submits.
  if (!rateLimit(`loan_analyze:${session.userId}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many analyses in a short time. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loanAnalysisSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { title, rawText } = parsed.data;

  const aiSettings = await prisma.aISettings.findUnique({ where: { ownerUserId: session.userId } });
  if (!aiSettings) {
    return NextResponse.json(
      { error: "No AI configuration found. Go to Settings → AI Configuration and add your own key (BYOK) first." },
      { status: 400 }
    );
  }

  // Persist the document immediately in PENDING state, so a failed AI call
  // still leaves an auditable record instead of silently losing the paste.
  const created = await prisma.loanDocument.create({
    data: { ownerUserId: session.userId, title: title || null, rawText, status: "PENDING" },
  });

  try {
    const apiKey = decryptSecret(aiSettings.encryptedApiKey);
    const extraction = await extractLoanFields(
      {
        provider: aiSettings.provider as "openai" | "anthropic" | "openai_compatible",
        model: aiSettings.model,
        apiKey,
        baseUrl: aiSettings.baseUrl,
      },
      rawText
    );

    const risk = computeLoanRisk(extraction.fields);

    const updated = await prisma.loanDocument.update({
      where: { id: created.id },
      data: {
        status: "ANALYZED",
        aiProvider: extraction.provider,
        aiModel: extraction.model,
        extractedJson: JSON.stringify(extraction.fields),
        plainSummary: extraction.plainSummary,
        analyzedAt: new Date(),
        riskScore: risk.score,
        riskBand: risk.band,
        riskFlagsJson: JSON.stringify(risk.flags),
      },
    });

    await logAudit(
      session.userId,
      "LOAN_DOCUMENT_ANALYZED",
      `id=${updated.id} provider=${extraction.provider} model=${extraction.model} riskScore=${risk.score}`
    );

    return NextResponse.json({ ok: true, id: updated.id });
  } catch (err) {
    const message =
      err instanceof AIConfigError || err instanceof AIProviderError
        ? err.message
        : "Unexpected error while analyzing the document with the AI provider.";

    await prisma.loanDocument.update({
      where: { id: created.id },
      data: { status: "FAILED", errorMessage: message },
    });
    await logAudit(session.userId, "LOAN_DOCUMENT_FAILED", `id=${created.id} error=${message}`);

    return NextResponse.json({ ok: false, id: created.id, error: message }, { status: 502 });
  }
}
