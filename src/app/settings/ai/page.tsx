"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, KeyRound } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Provider = "openai" | "anthropic" | "openai_compatible";

const MODEL_HINTS: Record<Provider, string> = {
  openai: "e.g. gpt-4o-mini, gpt-4o",
  anthropic: "e.g. claude-sonnet-4-6, claude-haiku-4-5-20251001",
  openai_compatible: "model id exposed by your custom endpoint",
};

export default function AISettingsPage() {
  const [provider, setProvider] = useState<Provider>("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [existing, setExisting] = useState<null | { maskedApiKey: string; provider: string; model: string; lastTestStatus?: string; lastTestMessage?: string }>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings/ai")
      .then((r) => r.json())
      .then((data) => {
        if (data.configured) {
          setExisting(data);
          setProvider(data.provider);
          setBaseUrl(data.baseUrl ?? "");
          setModel(data.model);
        }
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/settings/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, baseUrl, model, apiKey }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error ?? "Failed to save configuration." });
      return;
    }
    setMessage({ type: "success", text: "AI configuration saved. You can now test the connection." });
    setExisting({ maskedApiKey: data.maskedApiKey, provider: data.provider, model: data.model });
    setApiKey("");
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    const res = await fetch("/api/settings/ai", { method: "PUT" });
    const data = await res.json();
    setTesting(false);
    setMessage({ type: data.ok ? "success" : "error", text: data.message });
  }

  return (
    <div className="flex min-h-screen bg-nest-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <KeyRound className="text-nest-500" />
            <h1 className="font-display text-2xl font-bold text-ink">AI Configuration (BYOK)</h1>
          </div>
          <p className="mt-2 text-sm text-ink/60">
            SafeNest AI never ships with a bundled AI key. Every AI-powered feature — loan document
            extraction, plain-language explanations — runs using <strong>your own</strong> API key,
            configured here. Nothing is hardcoded in source or environment files; this is stored
            encrypted and scoped to your account only.
          </p>

          {existing && (
            <div className="mt-6 rounded-xl border border-nest-200 bg-white p-4 text-sm">
              <p className="font-semibold text-ink">Currently configured</p>
              <p className="mt-1 text-ink/60">
                Provider: <strong>{existing.provider}</strong> · Model: <strong>{existing.model}</strong> · Key:{" "}
                <code>{existing.maskedApiKey}</code>
              </p>
            </div>
          )}

          <form onSubmit={handleSave} className="card mt-6 space-y-4">
            <div>
              <label className="label">Provider</label>
              <div className="grid grid-cols-3 gap-2">
                {(["openai", "anthropic", "openai_compatible"] as Provider[]).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setProvider(p)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${
                      provider === p ? "border-nest-500 bg-nest-100 text-nest-700" : "border-nest-200 text-ink/60"
                    }`}
                  >
                    {p.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {provider === "openai_compatible" && (
              <div>
                <label className="label">Base URL</label>
                <input
                  className="input"
                  placeholder="https://your-endpoint.example.com/v1/chat/completions"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  required
                />
              </div>
            )}

            <div>
              <label className="label">Model</label>
              <input
                className="input"
                placeholder={MODEL_HINTS[provider]}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">API Key</label>
              <input
                type="password"
                className="input"
                placeholder={existing ? "Enter a new key to replace the saved one" : "sk-…"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required={!existing}
              />
              <p className="mt-1 text-xs text-ink/40">Encrypted at rest with AES-256-GCM. Never logged or exposed to other users.</p>
            </div>

            {message && (
              <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${message.type === "success" ? "bg-nest-100 text-nest-700" : "bg-red-50 text-red-700"}`}>
                {message.type === "success" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? "Saving…" : "Save configuration"}
              </button>
              {existing && (
                <button type="button" onClick={handleTest} disabled={testing} className="btn-secondary flex-1">
                  {testing ? "Testing…" : "Test connection"}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
