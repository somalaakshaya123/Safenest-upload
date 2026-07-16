import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LangProvider } from "@/lib/i18n/LangProvider";
import type { LangCode } from "@/lib/i18n/types";
import { SUPPORTED_LANGS } from "@/lib/i18n/types";

export const metadata: Metadata = {
  title: "SafeNest AI — Financial Wellness & Loan Transparency",
  description:
    "A secure platform helping Indian borrowers understand loan documents, assess financial health, avoid predatory lending, and find safer credit options.",
};

async function resolveInitialLang(): Promise<LangCode> {
  const session = await getSession().catch(() => null);
  if (!session) return "en";
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { preferredLang: true } });
  if (user && (SUPPORTED_LANGS as readonly string[]).includes(user.preferredLang)) {
    return user.preferredLang as LangCode;
  }
  return "en";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialLang = await resolveInitialLang();
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-body bg-nest-50 text-ink antialiased">
        <LangProvider initialLang={initialLang}>{children}</LangProvider>
      </body>
    </html>
  );
}
