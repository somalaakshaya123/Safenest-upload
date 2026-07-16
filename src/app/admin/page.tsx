"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, Users, HandCoins, FileSearch, Bot, ScrollText, Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Stats = {
  userCount: number;
  borrowerCount: number;
  lenderCount: number;
  disabledCount: number;
  offerCount: number;
  activeOfferCount: number;
  applicationCount: number;
  loanDocCount: number;
  aiConfiguredCount: number;
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (r) => {
        if (r.status === 403) {
          setForbidden(true);
          return;
        }
        setStats(await r.json());
      })
      .catch(() => setForbidden(true));
  }, []);

  if (forbidden) {
    return (
      <div className="flex min-h-screen bg-nest-50">
        <Sidebar />
        <main className="flex-1 p-8 text-center text-ink/50">Admin access required.</main>
      </div>
    );
  }

  const cards = stats
    ? [
        { label: "Total users", value: stats.userCount, icon: Users, sub: `${stats.borrowerCount} borrowers · ${stats.lenderCount} lenders · ${stats.disabledCount} disabled` },
        { label: "Marketplace offers", value: stats.offerCount, icon: HandCoins, sub: `${stats.activeOfferCount} active · ${stats.applicationCount} applications` },
        { label: "Loan documents analyzed", value: stats.loanDocCount, icon: FileSearch, sub: "Phase 3 — BYOK-powered" },
        { label: "Users with AI configured", value: stats.aiConfiguredCount, icon: Bot, sub: "BYOK settings saved" },
      ]
    : [];

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <ShieldAlert className="text-nestwarm-500" /> Admin Panel
          </h1>
          <p className="mt-1 text-ink/60">Platform oversight — users, marketplace moderation, and audit logs.</p>

          {!stats ? (
            <div className="mt-16 flex justify-center"><Loader2 className="animate-spin text-nest-400" size={32} /></div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4">
              {cards.map((c) => (
                <div key={c.label} className="card flex items-start gap-3">
                  <c.icon className="mt-1 text-nest-500" size={22} />
                  <div>
                    <p className="text-2xl font-bold text-ink">{c.value}</p>
                    <p className="text-sm font-medium text-ink/70">{c.label}</p>
                    <p className="text-xs text-ink/40">{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 grid grid-cols-3 gap-4">
            <Link href="/admin/users" className="card flex items-center gap-3 transition hover:shadow-cardHover">
              <Users className="text-nest-500" size={22} />
              <div>
                <p className="font-semibold text-ink">Users</p>
                <p className="text-xs text-ink/50">Enable / disable, change role</p>
              </div>
            </Link>
            <Link href="/admin/offers" className="card flex items-center gap-3 transition hover:shadow-cardHover">
              <HandCoins className="text-nest-500" size={22} />
              <div>
                <p className="font-semibold text-ink">Offers</p>
                <p className="text-xs text-ink/50">Moderate marketplace listings</p>
              </div>
            </Link>
            <Link href="/admin/audit-logs" className="card flex items-center gap-3 transition hover:shadow-cardHover">
              <ScrollText className="text-nest-500" size={22} />
              <div>
                <p className="font-semibold text-ink">Audit logs</p>
                <p className="text-xs text-ink/50">Recent platform activity</p>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
