"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { DictionaryKey, LangCode } from "./types";
import { translate } from "./index";

type LangContextValue = {
  lang: LangCode;
  t: (key: DictionaryKey) => string;
  setLang: (lang: LangCode) => Promise<void>;
  saving: boolean;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({
  initialLang,
  children,
}: {
  initialLang: LangCode;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<LangCode>(initialLang);
  const [saving, setSaving] = useState(false);

  const setLang = useCallback(async (next: LangCode) => {
    setLangState(next); // optimistic — UI switches immediately
    setSaving(true);
    try {
      await fetch("/api/settings/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: next }),
      });
    } catch {
      // Non-fatal — the UI still reflects the chosen language for this
      // session even if the background save fails; user can retry.
    } finally {
      setSaving(false);
    }
  }, []);

  const t = useCallback((key: DictionaryKey) => translate(lang, key), [lang]);

  const value = useMemo(() => ({ lang, t, setLang, saving }), [lang, t, setLang, saving]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // Sensible fallback for any component rendered outside the provider
    // (e.g. auth pages before login) — defaults to English, never crashes.
    return { lang: "en", t: (key) => translate("en", key), setLang: async () => {}, saving: false };
  }
  return ctx;
}
