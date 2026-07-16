/**
 * Loan Document AI Extraction — Phase 3.
 *
 * This is the one module in the codebase that makes a real, live call to an
 * LLM using the user's own BYOK key (via src/lib/ai/client.ts). It never
 * decides whether loan terms are "risky" — that judgment is made afterwards,
 * deterministically, by src/lib/riskEngine.ts. This module's only job is to
 * read free-text loan document content and pull out the structured numbers
 * a human would have to hunt for, plus a plain-language summary.
 *
 * The extraction is asked to return strict JSON. Because different providers
 * / models don't always obey that perfectly, the response is parsed
 * defensively: if JSON parsing fails, the caller gets a clear error rather
 * than a silently-wrong result.
 */

import { callAI, type AICallConfig, AIConfigError, AIProviderError } from "./client";

export type ExtractedLoanFields = {
  lenderName: string | null;
  loanType: string | null; // HOME | VEHICLE | EDUCATION | BUSINESS | PERSONAL | AGRICULTURE | MEDICAL | GOLD | CREDIT_CARD | OTHER
  principalAmount: number | null;
  currency: string | null;
  interestRatePct: number | null;
  interestRateType: "fixed" | "floating" | null;
  aprPct: number | null; // effective/true annual cost if stated separately from nominal rate
  tenureMonths: number | null;
  processingFeePct: number | null;
  prepaymentPenaltyPct: number | null;
  hasForeclosureLockIn: boolean;
  insuranceBundled: boolean;
  otherFees: { name: string; detail: string }[];
  redFlagsNoted: string[]; // short, literal observations grounded in the text — not a risk judgment
};

export type LoanExtractionResult = {
  fields: ExtractedLoanFields;
  plainSummary: string;
  provider: string;
  model: string;
};

const EMPTY_FIELDS: ExtractedLoanFields = {
  lenderName: null,
  loanType: null,
  principalAmount: null,
  currency: null,
  interestRatePct: null,
  interestRateType: null,
  aprPct: null,
  tenureMonths: null,
  processingFeePct: null,
  prepaymentPenaltyPct: null,
  hasForeclosureLockIn: false,
  insuranceBundled: false,
  otherFees: [],
  redFlagsNoted: [],
};

const SYSTEM_PROMPT = `You are a precise document-extraction assistant for a financial literacy tool used in India.
You will be given raw text from a loan document, offer letter, or loan agreement. It may be in English or contain Indian regional-language terms.

Your job is ONLY to extract facts that are literally present or very clearly implied in the text, and to summarize them in plain language. You must NOT judge whether the loan is a good or bad deal, calculate a risk score, or give financial advice — a separate rule-based system handles that.

Respond with ONLY a single valid JSON object, no markdown fences, no commentary, matching exactly this shape:
{
  "lenderName": string|null,
  "loanType": one of "HOME"|"VEHICLE"|"EDUCATION"|"BUSINESS"|"PERSONAL"|"AGRICULTURE"|"MEDICAL"|"GOLD"|"CREDIT_CARD"|"OTHER"|null,
  "principalAmount": number|null,
  "currency": string|null (e.g. "INR"),
  "interestRatePct": number|null (the stated nominal annual rate, as a plain number like 10.5),
  "interestRateType": "fixed"|"floating"|null,
  "aprPct": number|null (only if the document states a separate effective/true/APR rate distinct from the nominal rate; otherwise null),
  "tenureMonths": number|null,
  "processingFeePct": number|null (as a percentage of principal, convert if given as a flat amount and principal is known),
  "prepaymentPenaltyPct": number|null,
  "hasForeclosureLockIn": boolean,
  "insuranceBundled": boolean,
  "otherFees": [{"name": string, "detail": string}],
  "redFlagsNoted": string[] (each item a short, literal quote-free description of a clause worth a human's attention, grounded strictly in text that is actually present, e.g. "Late payment fee increases the effective rate to 24% after 2 missed EMIs." Return an empty array if nothing stands out. Do not invent clauses.)
}

If a field cannot be determined from the text, use null (or false/[] for booleans/arrays). Never fabricate numbers.`;

function buildUserPrompt(rawText: string): string {
  // Cap input length defensively — this is a document analyzer, not a
  // general chat surface, and keeps token usage predictable for the user's
  // own billed API key.
  const capped = rawText.length > 12000 ? rawText.slice(0, 12000) + "\n...[truncated]" : rawText;
  return `Loan document text follows between the markers.\n---BEGIN DOCUMENT---\n${capped}\n---END DOCUMENT---\n\nAfter the JSON object described in your instructions, also think about a 4-6 sentence plain-language summary — but output ONLY the JSON object, and include that summary inside it as an additional top-level field "plainSummary" (string, written for someone with no finance background, in simple sentences).`;
}

function extractJsonObject(text: string): unknown {
  // Strip markdown code fences if the model added them despite instructions.
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("The AI response did not contain a JSON object.");
  }
  const jsonSlice = candidate.slice(start, end + 1);
  return JSON.parse(jsonSlice);
}

function coerceFields(raw: unknown): { fields: ExtractedLoanFields; plainSummary: string } {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim().length > 0 ? v.trim() : null);
  const bool = (v: unknown): boolean => v === true;
  const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const feeArr = (v: unknown): { name: string; detail: string }[] =>
    Array.isArray(v)
      ? v
          .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
          .map((x) => ({ name: str(x.name) ?? "Fee", detail: str(x.detail) ?? "" }))
      : [];

  const VALID_LOAN_TYPES = new Set([
    "HOME",
    "VEHICLE",
    "EDUCATION",
    "BUSINESS",
    "PERSONAL",
    "AGRICULTURE",
    "MEDICAL",
    "GOLD",
    "CREDIT_CARD",
    "OTHER",
  ]);
  const loanTypeRaw = str(obj.loanType)?.toUpperCase() ?? null;
  const loanType = loanTypeRaw && VALID_LOAN_TYPES.has(loanTypeRaw) ? loanTypeRaw : null;

  const rateTypeRaw = str(obj.interestRateType)?.toLowerCase();
  const interestRateType = rateTypeRaw === "fixed" || rateTypeRaw === "floating" ? rateTypeRaw : null;

  const fields: ExtractedLoanFields = {
    lenderName: str(obj.lenderName),
    loanType,
    principalAmount: num(obj.principalAmount),
    currency: str(obj.currency),
    interestRatePct: num(obj.interestRatePct),
    interestRateType,
    aprPct: num(obj.aprPct),
    tenureMonths: num(obj.tenureMonths),
    processingFeePct: num(obj.processingFeePct),
    prepaymentPenaltyPct: num(obj.prepaymentPenaltyPct),
    hasForeclosureLockIn: bool(obj.hasForeclosureLockIn),
    insuranceBundled: bool(obj.insuranceBundled),
    otherFees: feeArr(obj.otherFees),
    redFlagsNoted: strArr(obj.redFlagsNoted).slice(0, 10),
  };

  const plainSummary = str(obj.plainSummary) ?? "The AI did not return a plain-language summary for this document.";

  return { fields, plainSummary };
}

export async function extractLoanFields(config: AICallConfig, rawText: string): Promise<LoanExtractionResult> {
  const result = await callAI(config, SYSTEM_PROMPT, buildUserPrompt(rawText));

  let parsed: unknown;
  try {
    parsed = extractJsonObject(result.text);
  } catch (err) {
    throw new AIProviderError(
      `The AI model responded but its output could not be parsed as structured data. Try again, or try a different model. (${
        err instanceof Error ? err.message : "parse error"
      })`
    );
  }

  const { fields, plainSummary } = coerceFields(parsed);

  return {
    fields,
    plainSummary,
    provider: result.provider,
    model: result.model,
  };
}

export { EMPTY_FIELDS };
export { AIConfigError, AIProviderError };
