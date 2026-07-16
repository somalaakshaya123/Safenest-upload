"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  FileSearch,
  Upload,
  Loader2,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  KeyRound,
  Trash2,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

type DocSummary = {
  id: string;
  title: string | null;
  status: "PENDING" | "ANALYZED" | "FAILED";
  riskScore: number | null;
  riskBand: string | null;
  aiProvider: string | null;
  aiModel: string | null;
  createdAt: string;
  analyzedAt: string | null;
};

const BAND_STYLES: Record<string, string> = {
  Excellent: "bg-nest-100 text-nest-700",
  Good: "bg-nest-100 text-nest-700",
  Fair: "bg-nestwarm-100 text-nestwarm-700",
  "At Risk": "bg-nestwarm-100 text-nestwarm-700",
  Critical: "bg-red-50 text-red-700",
};

export default function LoansPage() {
  const [docs, setDocs] = useState<DocSummary[] | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refreshList() {
    fetch("/api/loans")
      .then((r) => r.json())
      .then((data) => setDocs(data.documents ?? []));
  }

  useEffect(() => {
    refreshList();
    fetch("/api/settings/ai")
      .then((r) => r.json())
      .then((data) => setAiConfigured(!!data.configured));
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    const reader = new FileReader();
    reader.onload = () => setRawText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, rawText }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok || data.error) {
      setError(data.error ?? "Something went wrong analyzing this document.");
      refreshList();
      return;
    }

    setTitle("");
    setRawText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    window.location.href = `/loans/${data.id}`;
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await fetch(`/api/loans/${id}`, { method: "DELETE" });
    setDeletingId(null);
    refreshList();
  }

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-3">
            <FileSearch className="text-nest-500" size={26} />
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Loan Document Analyzer</h1>
              <p className="mt-1 text-sm text-ink/60">
                Paste (or upload) a loan offer, agreement, or sanction letter to get a plain-language breakdown.
              </p>
            </div>
          </div>

          {/* AI disclosure — required by build-phase compliance rules */}
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-nest-200 bg-white px-4 py-3 text-sm text-ink/70">
            <Sparkles className="mt-0.5 shrink-0 text-nest-500" size={18} />
            <span>
              Extraction and the plain-language summary below are produced by <strong>a real AI model, called with
              your own API key</strong> (BYOK) — never a bundled or hardcoded key. The risk score underneath it is a
              separate, fixed rule engine (<code>src/lib/riskEngine.ts</code>) that runs on the extracted numbers —
              not the AI's own opinion.
            </span>
          </div>

          {aiConfigured === false && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-nestwarm-400/40 bg-nestwarm-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <KeyRound className="text-nestwarm-600" size={20} />
                <div>
                  <p className="font-semibold text-nestwarm-700">AI not configured yet</p>
                  <p className="text-sm text-nestwarm-600">Add your own API key before analyzing a document.</p>
                </div>
              </div>
              <Link href="/settings/ai" className="btn-primary !px-4 !py-2 text-sm">
                Configure
              </Link>
            </div>
          )}

          <form onSubmit={handleAnalyze} className="card mt-6">
            <label className="label" htmlFor="title">
              Title (optional)
            </label>
            <input
              id="title"
              className="input"
              placeholder="e.g. XYZ Bank personal loan offer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={150}
            />

            <label className="label mt-4" htmlFor="rawText">
              Loan document text
            </label>
            <textarea
              id="rawText"
              className="input min-h-[220px] resize-y font-mono text-sm"
              placeholder="Paste the loan offer / agreement text here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              maxLength={20000}
            />
            <div className="mt-2 flex items-center justify-between text-xs text-ink/40">
              <span>{rawText.length} / 20,000 characters</span>
              <label className="flex cursor-pointer items-center gap-1.5 font-medium text-nest-600 hover:text-nest-700">
                <Upload size={14} /> Upload a .txt file instead
                <input ref={fileInputRef} type="file" accept=".txt,.md,text/plain" className="hidden" onChange={handleFile} />
              </label>
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || rawText.trim().length < 40 || aiConfigured === false}
              className="btn-primary mt-4 w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> Analyzing with your AI key…
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Analyze document
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <h2 className="font-display font-semibold text-ink">Past analyses</h2>
            {docs === null ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-ink/50">
                <Loader2 className="animate-spin" size={16} /> Loading…
              </div>
            ) : docs.length === 0 ? (
              <p className="mt-3 text-sm text-ink/50">No documents analyzed yet — paste one above to get started.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {docs.map((d) => (
                  <li key={d.id} className="card flex items-center justify-between gap-4 !p-4">
                    <Link href={`/loans/${d.id}`} className="flex flex-1 items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{d.title || "Untitled document"}</p>
                        <p className="text-xs text-ink/50">
                          {new Date(d.createdAt).toLocaleString("en-IN")}
                          {d.aiProvider && d.aiModel ? ` · Powered by ${d.aiProvider}/${d.aiModel}` : ""}
                        </p>
                      </div>
                      {d.status === "ANALYZED" && d.riskBand && (
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${BAND_STYLES[d.riskBand]}`}>
                          {d.riskScore}/100 · {d.riskBand}
                        </span>
                      )}
                      {d.status === "FAILED" && (
                        <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          Failed
                        </span>
                      )}
                      {d.status === "PENDING" && (
                        <span className="shrink-0 rounded-full bg-nest-100 px-3 py-1 text-xs font-semibold text-nest-700">
                          Pending
                        </span>
                      )}
                      <ChevronRight className="shrink-0 text-ink/30" size={18} />
                    </Link>
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deletingId === d.id}
                      className="shrink-0 rounded-lg p-2 text-ink/30 hover:bg-red-50 hover:text-red-600"
                      title="Delete"
                    >
                      {deletingId === d.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
