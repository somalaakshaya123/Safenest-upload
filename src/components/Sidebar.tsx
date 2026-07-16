"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, HeartPulse, FileSearch, Landmark, HandCoins, Settings, LogOut, ShieldAlert, Globe } from "lucide-react";
import Logo from "./Logo";
import { useLang } from "@/lib/i18n/LangProvider";
import { SUPPORTED_LANGS, LANG_LABELS } from "@/lib/i18n/types";
import type { LangCode } from "@/lib/i18n/types";

type Role = "BORROWER" | "LENDER" | "ADMIN";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, t, setLang } = useLang();
  const [role, setRole] = useState<Role | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) setRole(d.user.role as Role);
      })
      .catch(() => {});
  }, []);

  const NAV = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/financial-health", label: t("nav.financialHealth"), icon: HeartPulse },
    { href: "/loans", label: t("nav.loanAnalyzer"), icon: FileSearch },
    { href: "/schemes", label: t("nav.schemes"), icon: Landmark },
    { href: "/marketplace", label: t("nav.marketplace"), icon: HandCoins },
    { href: "/settings/ai", label: t("nav.aiSettings"), icon: Settings },
  ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-nest-100 bg-white px-4 py-6">
      <div className="px-2"><Logo size={36} /></div>
      <nav className="mt-8 flex-1 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-nest-100 text-nest-700" : "text-ink/60 hover:bg-nest-50"
              }`}
            >
              <span className="flex items-center gap-3">
                <item.icon size={18} />
                {item.label}
              </span>
            </Link>
          );
        })}
        {role === "ADMIN" && (
          <Link
            href="/admin"
            className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              pathname.startsWith("/admin") ? "bg-nestwarm-100 text-nestwarm-700" : "text-ink/60 hover:bg-nest-50"
            }`}
          >
            <span className="flex items-center gap-3">
              <ShieldAlert size={18} />
              {t("nav.admin")}
            </span>
          </Link>
        )}
      </nav>

      <div className="relative mb-2">
        <button
          onClick={() => setLangMenuOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink/60 hover:bg-nest-50"
        >
          <Globe size={18} />
          {t("common.language")}: <span className="text-ink/80">{LANG_LABELS[lang]}</span>
        </button>
        {langMenuOpen && (
          <div className="absolute bottom-full left-0 mb-1 w-full rounded-lg border border-nest-100 bg-white p-1 shadow-cardHover">
            {SUPPORTED_LANGS.map((code: LangCode) => (
              <button
                key={code}
                onClick={() => {
                  setLang(code);
                  setLangMenuOpen(false);
                }}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                  code === lang ? "bg-nest-100 text-nest-700" : "text-ink/70 hover:bg-nest-50"
                }`}
              >
                {LANG_LABELS[code]}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={logout} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink/60 hover:bg-nest-50">
        <LogOut size={18} /> {t("nav.logout")}
      </button>
    </aside>
  );
}
