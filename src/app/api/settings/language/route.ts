import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { languagePrefSchema } from "@/lib/validation";
import { logAudit } from "@/lib/security";

// Deterministic preference save — no AI/LLM involvement. Persists which of
// the static UI dictionaries (src/lib/i18n) the user wants their chrome
// rendered in.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = languagePrefSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { preferredLang: parsed.data.preferredLanguage },
  });

  await logAudit(session.userId, "LANGUAGE_PREFERENCE_UPDATED", `lang=${parsed.data.preferredLanguage}`);

  return NextResponse.json({ ok: true, preferredLanguage: parsed.data.preferredLanguage });
}
