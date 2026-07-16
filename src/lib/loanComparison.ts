/**
 * Loan Comparison Engine — Phase 4.
 *
 * THIS ENTIRE MODULE IS 100% DETERMINISTIC RULE-BASED LOGIC, same guarantee as
 * src/lib/scoring.ts and src/lib/riskEngine.ts. LENDER_PROFILES below is a fixed,
 * hardcoded table of *typical, illustrative* rate/fee ranges per lender category —
 * clearly labeled planning assumptions, never a live quote, offer, or prediction
 * from any real lender. buildLoanComparison() runs the same reducing-balance EMI
 * formula already used by scoring.ts (`calculateEMI`) against the user's own
 * desired loan amount/tenure (from their Phase 2 profile) to estimate what each
 * lender category might cost, and — where the user has real analyzed loan
 * documents from Phase 3 — lines those up alongside using the AI-EXTRACTED
 * numbers (extraction is BYOK/AI-powered; this file only does the arithmetic on
 * numbers that extraction already produced, and never calls an LLM itself).
 */

import { calculateEMI, type LoanPurpose } from "./scoring";
import type { ExtractedLoanFields } from "./ai/loanExtraction";

export type LenderCategory =
  | "PUBLIC_BANK"
  | "PRIVATE_BANK"
  | "NBFC"
  | "DIGITAL_LENDER"
  | "GOLD_LOAN"
  | "GOVT_SCHEME_LINKED";

export type LenderProfile = {
  category: LenderCategory;
  label: string;
  description: string;
  // Illustrative annual rate range in % p.a. per loan purpose. Missing purpose = category doesn't typically serve it.
  rateRangeByPurpose: Partial<Record<LoanPurpose, [number, number]>>;
  processingFeePctRange: [number, number];
  prosNote: string;
  consNote: string;
};

// Illustrative planning ranges only — see module doc comment above. Not a real quote.
export const LENDER_PROFILES: LenderProfile[] = [
  {
    category: "PUBLIC_BANK",
    label: "Public Sector Bank",
    description: "Nationalized/PSU banks (e.g. SBI, PNB, Bank of Baroda and similar).",
    rateRangeByPurpose: {
      HOME: [8.0, 9.5],
      VEHICLE: [8.5, 11],
      EDUCATION: [8.0, 10.5],
      BUSINESS: [9.5, 14],
      PERSONAL: [10.5, 15],
      AGRICULTURE: [6.5, 9],
      MEDICAL: [10.5, 15],
      OTHER: [9.5, 14],
    },
    processingFeePctRange: [0, 1],
    prosNote: "Usually the lowest rates and best access to government interest-subsidy schemes.",
    consNote: "Slower processing, more documentation, stricter eligibility checks.",
  },
  {
    category: "PRIVATE_BANK",
    label: "Private Bank",
    description: "Private-sector banks (e.g. HDFC, ICICI, Axis and similar).",
    rateRangeByPurpose: {
      HOME: [8.3, 10.5],
      VEHICLE: [9, 12],
      EDUCATION: [9, 12],
      BUSINESS: [11, 16],
      PERSONAL: [11, 18],
      AGRICULTURE: [8, 11],
      MEDICAL: [11, 18],
      OTHER: [11, 16],
    },
    processingFeePctRange: [0.5, 2],
    prosNote: "Faster processing and digital onboarding than most public banks.",
    consNote: "Rates and fees typically run a bit higher than public-sector banks.",
  },
  {
    category: "NBFC",
    label: "NBFC (Non-Banking Financial Company)",
    description: "Registered non-bank lenders (e.g. Bajaj Finserv, Tata Capital and similar).",
    rateRangeByPurpose: {
      HOME: [9, 13],
      VEHICLE: [10, 15],
      EDUCATION: [10, 14],
      BUSINESS: [13, 20],
      PERSONAL: [13, 26],
      MEDICAL: [13, 24],
      OTHER: [13, 22],
    },
    processingFeePctRange: [1, 3],
    prosNote: "More flexible eligibility criteria; often faster than banks for smaller tickets.",
    consNote: "Noticeably higher rates than banks, and fees can add up quickly.",
  },
  {
    category: "DIGITAL_LENDER",
    label: "Digital/Fintech Lender",
    description: "App-based lenders offering small-ticket, fast-disbursal personal/consumer loans.",
    rateRangeByPurpose: {
      PERSONAL: [15, 32],
      MEDICAL: [15, 30],
      OTHER: [15, 30],
    },
    processingFeePctRange: [1, 4],
    prosNote: "Minutes-to-hours disbursal, minimal paperwork.",
    consNote: "Among the highest effective rates here — read the fee schedule closely before accepting.",
  },
  {
    category: "GOLD_LOAN",
    label: "Gold Loan (secured against jewellery)",
    description: "Loans secured against gold jewellery/coins, from banks or specialized NBFCs.",
    rateRangeByPurpose: {
      PERSONAL: [9, 16],
      BUSINESS: [9, 16],
      AGRICULTURE: [7, 12],
      MEDICAL: [9, 16],
      OTHER: [9, 16],
    },
    processingFeePctRange: [0, 1],
    prosNote: "Fast disbursal and comparatively low rates because the loan is secured.",
    consNote: "Risk of losing pledged gold on default; loan amount capped by gold value, not income.",
  },
  {
    category: "GOVT_SCHEME_LINKED",
    label: "Government Scheme-Linked Loan",
    description: "Bank/NBFC loans disbursed under a government scheme's guarantee or interest-subvention cover — see the Schemes tab for specific programmes you may qualify for.",
    rateRangeByPurpose: {
      HOME: [6.5, 9],
      BUSINESS: [7, 12],
      AGRICULTURE: [4, 7],
      EDUCATION: [4, 9],
      OTHER: [7, 12],
    },
    processingFeePctRange: [0, 0.5],
    prosNote: "Lowest potential rates here, thanks to a government subsidy/guarantee — but requires meeting the specific scheme's eligibility first.",
    consNote: "Requires extra paperwork/certification for the scheme itself, and caps may be lower than open-market loans.",
  },
];

export type ComparisonRow = {
  key: string;
  label: string;
  source: "indicative" | "your_analysis";
  description: string;
  rateLowPct: number;
  rateHighPct: number;
  representativeRatePct: number;
  emiLow: number;
  emiHigh: number;
  totalPaymentLow: number;
  totalPaymentHigh: number;
  totalInterestLow: number;
  totalInterestHigh: number;
  processingFeePctRange?: [number, number];
  notes: string;
};

function buildRow(
  key: string,
  label: string,
  source: ComparisonRow["source"],
  description: string,
  principal: number,
  tenureMonths: number,
  rateLow: number,
  rateHigh: number,
  processingFeePctRange: [number, number] | undefined,
  notes: string
): ComparisonRow {
  const emiLow = calculateEMI(principal, rateLow, tenureMonths);
  const emiHigh = calculateEMI(principal, rateHigh, tenureMonths);
  const totalPaymentLow = emiLow * tenureMonths;
  const totalPaymentHigh = emiHigh * tenureMonths;
  return {
    key,
    label,
    source,
    description,
    rateLowPct: rateLow,
    rateHighPct: rateHigh,
    representativeRatePct: (rateLow + rateHigh) / 2,
    emiLow,
    emiHigh,
    totalPaymentLow,
    totalPaymentHigh,
    totalInterestLow: totalPaymentLow - principal,
    totalInterestHigh: totalPaymentHigh - principal,
    processingFeePctRange,
    notes,
  };
}

export type AnalyzedDocForComparison = {
  id: string;
  title: string | null;
  fields: ExtractedLoanFields;
};

/**
 * Builds the comparison table: one indicative row per lender category that
 * serves the user's stated loan purpose, plus one row per real analyzed loan
 * document (Phase 3) that has enough extracted numbers to compute an EMI.
 */
export function buildLoanComparison(
  loanPurpose: LoanPurpose,
  desiredLoanAmount: number,
  desiredTenureMonths: number,
  analyzedDocs: AnalyzedDocForComparison[] = []
): ComparisonRow[] {
  const rows: ComparisonRow[] = [];

  for (const lender of LENDER_PROFILES) {
    const range = lender.rateRangeByPurpose[loanPurpose];
    if (!range) continue; // this lender category doesn't typically serve this purpose
    const [rateLow, rateHigh] = range;
    rows.push(
      buildRow(
        `indicative_${lender.category}`,
        lender.label,
        "indicative",
        lender.description,
        desiredLoanAmount,
        desiredTenureMonths,
        rateLow,
        rateHigh,
        lender.processingFeePctRange,
        `${lender.prosNote} ${lender.consNote}`
      )
    );
  }

  for (const doc of analyzedDocs) {
    const { fields } = doc;
    if (fields.principalAmount == null || fields.interestRatePct == null || fields.tenureMonths == null) continue;
    const rate = fields.aprPct ?? fields.interestRatePct;
    rows.push(
      buildRow(
        `analysis_${doc.id}`,
        doc.title || "Your analyzed document",
        "your_analysis",
        "From your own Loan Document Analyzer result — extracted by AI (BYOK), arithmetic done here.",
        fields.principalAmount,
        fields.tenureMonths,
        rate,
        rate,
        fields.processingFeePct != null ? [fields.processingFeePct, fields.processingFeePct] : undefined,
        fields.lenderName ? `Stated lender: ${fields.lenderName}.` : "Lender not stated in the document."
      )
    );
  }

  return rows.sort((a, b) => a.representativeRatePct - b.representativeRatePct);
}
