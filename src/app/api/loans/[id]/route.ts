import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { logAudit, rateLimit } from "@/lib/security";
import { extractLoanFields, AIConfigError, AIProviderError } from "@/lib/ai/loanExtraction";
import { computeLoanRisk } from "@/lib/riskEngine";

async function getOwnedDoc(id: string, userId: string) {
  const doc = await prisma.loanDocument.findUnique({ where: { id } });
  if (!doc || doc.ownerUserId !== userId) return null;
  return doc;
}

function serialize(doc: NonNullable<Awaited<ReturnType<typeof getOwnedDoc>>>) {
  return {
    id: doc.id,
    title: doc.title,
    rawText: doc.rawText,
    status: doc.status,
    errorMessage: doc.errorMessage,
    aiProvider: doc.aiProvider,
    aiModel: doc.aiModel,
    plainSummary: doc.plainSummary,
    extracted: doc.extractedJson ? JSON.parse(doc.extractedJson) : null,
    analyzedAt: doc.analyzedAt,
    riskScore: doc.riskScore,
    riskBand: doc.riskBand,
    riskFlags: doc.riskFlagsJson ? JSON.parse(doc.riskFlagsJson) : [],
    createdAt: doc.createdAt,
  };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const doc = await getOwnedDoc(params.id, session.userId);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(serialize(doc));
}

// Re-run the AI extraction + risk engine on the same stored text — useful
// after switching provider/model in Settings, or retrying a FAILED analysis.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!rateLimit(`loan_analyze:${session.userId}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many analyses in a short time. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  const doc = await getOwnedDoc(params.id, session.userId);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const aiSettings = await prisma.aISettings.findUnique({ where: { ownerUserId: session.userId } });
  if (!aiSettings) {
    return NextResponse.json(
      { error: "No AI configuration found. Go to Settings → AI Configuration and add your own key (BYOK) first." },
      { status: 400 }
    );
  }

  try {
    const apiKey = decryptSecret(aiSettings.encryptedApiKey);
    const extraction = await extractLoanFields(
      {
        provider: aiSettings.provider as "openai" | "anthropic" | "openai_compatible",
        model: aiSettings.model,
        apiKey,
        baseUrl: aiSettings.baseUrl,
      },
      doc.rawText
    );
    const risk = computeLoanRisk(extraction.fields);

    const updated = await prisma.loanDocument.update({
      where: { id: doc.id },
      data: {
        status: "ANALYZED",
        errorMessage: null,
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

    await logAudit(session.userId, "LOAN_DOCUMENT_REANALYZED", `id=${updated.id} riskScore=${risk.score}`);
    return NextResponse.json(serialize(updated));
  } catch (err) {
    const message =
      err instanceof AIConfigError || err instanceof AIProviderError
        ? err.message
        : "Unexpected error while analyzing the document with the AI provider.";
    const updated = await prisma.loanDocument.update({
      where: { id: doc.id },
      data: { status: "FAILED", errorMessage: message },
    });
    return NextResponse.json({ ...serialize(updated), error: message }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const doc = await getOwnedDoc(params.id, session.userId);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.loanDocument.delete({ where: { id: doc.id } });
  await logAudit(session.userId, "LOAN_DOCUMENT_DELETED", `id=${doc.id}`);

  return NextResponse.json({ ok: true });
}
