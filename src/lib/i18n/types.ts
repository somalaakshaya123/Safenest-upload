/**
 * Multilingual UI dictionaries — Phase 5.
 *
 * THIS IS A STATIC, HAND-WRITTEN DICTIONARY, NOT AN AI TRANSLATION FEATURE.
 * It is deterministic, rule-based key -> string lookup for fixed pieces of UI
 * chrome (nav labels, buttons, headings, status words). It calls no LLM and
 * no BYOK key. This is a *different* thing from the AI-powered "multilingual
 * rewriting" feature required elsewhere in the compliance spec — that one
 * (paraphrasing arbitrary loan-document text into another language) would
 * need a real model call and is out of scope for this static UI dictionary.
 *
 * Coverage: navigation, common actions/status words, and headings for the
 * Dashboard, Marketplace, and Admin surfaces built in Phase 5, plus the
 * language switcher itself. Page body copy on earlier-phase pages
 * (financial-health breakdowns, loan analysis, scheme descriptions) remains
 * English-only in this build — see README for exact coverage and the
 * native-speaker-review disclaimer.
 */

export const SUPPORTED_LANGS = ["en", "en-simple", "ta", "hi", "te", "ml"] as const;
export type LangCode = (typeof SUPPORTED_LANGS)[number];

export const LANG_LABELS: Record<LangCode, string> = {
  en: "English",
  "en-simple": "Simple English",
  ta: "தமிழ் (Tamil)",
  hi: "हिन्दी (Hindi)",
  te: "తెలుగు (Telugu)",
  ml: "മലയാളം (Malayalam)",
};

export type DictionaryKey =
  | "nav.dashboard"
  | "nav.financialHealth"
  | "nav.loanAnalyzer"
  | "nav.schemes"
  | "nav.marketplace"
  | "nav.admin"
  | "nav.aiSettings"
  | "nav.logout"
  | "common.save"
  | "common.cancel"
  | "common.submit"
  | "common.loading"
  | "common.back"
  | "common.viewDetails"
  | "common.status"
  | "common.actions"
  | "common.ruleBased"
  | "common.aiPowered"
  | "common.language"
  | "dashboard.welcome"
  | "dashboard.roadmap"
  | "marketplace.title"
  | "marketplace.subtitle"
  | "marketplace.browseOffers"
  | "marketplace.myOffers"
  | "marketplace.myApplications"
  | "marketplace.postOffer"
  | "marketplace.apply"
  | "marketplace.applied"
  | "marketplace.matchScore"
  | "marketplace.strongMatch"
  | "marketplace.possibleMatch"
  | "marketplace.notEligible"
  | "marketplace.applications"
  | "marketplace.noOffers"
  | "marketplace.estimatedEmi"
  | "admin.title"
  | "admin.subtitle"
  | "admin.users"
  | "admin.auditLogs"
  | "admin.offers"
  | "admin.stats"
  | "admin.disable"
  | "admin.enable"
  | "admin.remove"
  | "admin.restore";

export type Dictionary = Record<DictionaryKey, string>;
