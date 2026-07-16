/**
 * Loan Risk Engine — Phase 3.
 *
 * THIS ENTIRE MODULE IS 100% DETERMINISTIC RULE-BASED LOGIC, same guarantee
 * as src/lib/scoring.ts. It takes the *structured numbers* an AI extraction
 * pass already pulled out of a loan document (see src/lib/ai/loanExtraction.ts)
 * and scores them against fixed, hardcoded thresholds defined below. It never
 * calls an LLM, never uses a BYOK key, and always produces the same score for
 * the same extracted numbers — so every point can be traced back to a rule
 * in this file. The AI is only ever used to *read* the document; deciding
 * whether the terms look risky is this engine's job, not the model's.
 *
 * Score is framed like the Financial Health score (0-100, higher = better/
 * safer) and reuses the exact same band thresholds and labels so the UI can
 * share <ScoreGauge /> and the band color map across both features.
 */

import type { ExtractedLoanFields } from "./ai/loanExtraction";

export type RiskFlag = {
  key: string;
  severity: "info" | "caution" | "warning";
  message: string;
};

export type RiskBreakdownItem = {
  key: string;
  label: string;
  weight: number;
  score: number; // 0..weight
  detail: string;
};

export type RiskResult = {
  score: number; // 0-100, higher = safer/more favorable terms
  band: "Excellent" | "Good" | "Fair" | "At Risk" | "Critical";
  breakdown: RiskBreakdownItem[];
  flags: RiskFlag[];
};

// Illustrative "typical market range" bands per loan type, used only to judge
// whether an extracted rate looks high — NOT a quote, offer, or prediction.
const TYPICAL_RATE_RANGE_PCT: Record<string, [number, number]> = {
  HOME: [8, 11],
  VEHICLE: [9, 13],
  EDUCATION: [8, 12],
  BUSINESS: [11, 18],
  PERSONAL: [11, 22],
  AGRICULTURE: [6, 10],
  MEDICAL: [11, 20],
  GOLD: [8, 14],
  CREDIT_CARD: [30, 42],
  OTHER: [10, 20],
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function bandFor(score: number): RiskResult["band"] {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 45) return "Fair";
  if (score >= 25) return "At Risk";
  return "Critical";
}

export function computeLoanRisk(fields: ExtractedLoanFields): RiskResult {
  const breakdown: RiskBreakdownItem[] = [];
  const flags: RiskFlag[] = [];

  // 1. Interest rate reasonableness — weight 25
  let rateScore = 12; // neutral default when rate could not be extracted
  const range = fields.loanType ? TYPICAL_RATE_RANGE_PCT[fields.loanType] : undefined;
  if (fields.interestRatePct == null) {
    breakdown.push({
      key: "rate",
      label: "Interest rate reasonableness",
      weight: 25,
      score: rateScore,
      detail: "No interest rate could be found in the document, so this could not be fully assessed.",
    });
    flags.push({ key: "no_rate", severity: "warning", message: "No clear interest rate was found in the document." });
  } else if (range) {
    const [low, high] = range;
    if (fields.interestRatePct <= low) rateScore = 25;
    else if (fields.interestRatePct <= high) rateScore = 18;
    else if (fields.interestRatePct <= high * 1.25) rateScore = 8;
    else rateScore = 0;
    breakdown.push({
      key: "rate",
      label: "Interest rate reasonableness",
      weight: 25,
      score: rateScore,
      detail: `Stated rate is ${fields.interestRatePct}% p.a. Typical market range for this loan type is roughly ${low}%-${high}% p.a.`,
    });
    if (rateScore <= 8) {
      flags.push({
        key: "high_rate",
        severity: "warning",
        message: `Interest rate of ${fields.interestRatePct}% p.a. is well above the typical ${low}%-${high}% range for this loan type.`,
      });
    }
  } else {
    rateScore = 15;
    breakdown.push({
      key: "rate",
      label: "Interest rate reasonableness",
      weight: 25,
      score: rateScore,
      detail: `Stated rate is ${fields.interestRatePct}% p.a. Loan type wasn't clear enough to compare against a market range.`,
    });
  }

  // 2. Rate transparency / hidden-cost gap between nominal rate and APR — weight 20
  let transparencyScore: number;
  const gap =
    fields.interestRatePct != null && fields.aprPct != null ? fields.aprPct - fields.interestRatePct : null;
  if (fields.interestRateType == null) {
    transparencyScore = 8;
  } else if (fields.interestRateType === "floating" && gap == null) {
    transparencyScore = 12; // floating rates carry inherent uncertainty even when disclosed
  } else if (gap == null) {
    transparencyScore = 16;
  } else if (gap <= 0.5) {
    transparencyScore = 20;
  } else if (gap <= 2) {
    transparencyScore = 12;
  } else {
    transparencyScore = 2;
  }
  breakdown.push({
    key: "transparency",
    label: "Rate transparency (stated rate vs. true APR)",
    weight: 20,
    score: transparencyScore,
    detail:
      gap != null
        ? `Effective APR (${fields.aprPct}%) is ${gap.toFixed(1)} points ${gap >= 0 ? "above" : "below"} the stated nominal rate (${fields.interestRatePct}%) once fees are folded in.`
        : `Rate type: ${fields.interestRateType ?? "not stated"}. No separate APR/effective-rate figure was found to compare against the nominal rate.`,
  });
  if (gap != null && gap > 2) {
    flags.push({
      key: "apr_gap",
      severity: "warning",
      message: `The effective APR is ${gap.toFixed(1)} percentage points higher than the advertised rate — fees are adding significant hidden cost.`,
    });
  }

  // 3. Fees & penalties — weight 25
  let feeScore = 25;
  const feeNotes: string[] = [];
  if (fields.processingFeePct != null) {
    if (fields.processingFeePct > 3) {
      feeScore -= 10;
      feeNotes.push(`processing fee ${fields.processingFeePct}% (high)`);
    } else if (fields.processingFeePct > 1.5) {
      feeScore -= 4;
      feeNotes.push(`processing fee ${fields.processingFeePct}%`);
    } else {
      feeNotes.push(`processing fee ${fields.processingFeePct}%`);
    }
  }
  if (fields.prepaymentPenaltyPct != null && fields.prepaymentPenaltyPct > 0) {
    feeScore -= fields.prepaymentPenaltyPct > 3 ? 8 : 4;
    feeNotes.push(`prepayment penalty ${fields.prepaymentPenaltyPct}%`);
    flags.push({
      key: "prepay_penalty",
      severity: "caution",
      message: `A prepayment/foreclosure penalty of ${fields.prepaymentPenaltyPct}% applies if the loan is paid off early.`,
    });
  }
  if (fields.hasForeclosureLockIn) {
    feeScore -= 5;
    feeNotes.push("lock-in period before foreclosure is allowed");
    flags.push({
      key: "lockin",
      severity: "caution",
      message: "The loan has a lock-in period before early closure is permitted.",
    });
  }
  if (fields.insuranceBundled) {
    feeScore -= 3;
    feeNotes.push("insurance bundled into the loan");
    flags.push({
      key: "bundled_insurance",
      severity: "info",
      message: "An insurance product appears to be bundled with the loan — check if it's optional.",
    });
  }
  if (fields.otherFees && fields.otherFees.length > 2) {
    feeScore -= 4;
    feeNotes.push(`${fields.otherFees.length} other fees listed`);
  }
  feeScore = clamp(feeScore, 0, 25);
  breakdown.push({
    key: "fees",
    label: "Fees & penalties",
    weight: 25,
    score: feeScore,
    detail: feeNotes.length > 0 ? feeNotes.join(", ") + "." : "No significant extra fees or penalties were identified.",
  });

  // 4. Disclosure completeness — weight 15
  const trackedFields: (keyof ExtractedLoanFields)[] = [
    "lenderName",
    "loanType",
    "principalAmount",
    "interestRatePct",
    "interestRateType",
    "tenureMonths",
    "processingFeePct",
  ];
  const foundCount = trackedFields.filter((k) => fields[k] !== null && fields[k] !== undefined).length;
  const disclosureScore = Math.round((foundCount / trackedFields.length) * 15);
  breakdown.push({
    key: "disclosure",
    label: "Document disclosure completeness",
    weight: 15,
    score: disclosureScore,
    detail: `${foundCount} of ${trackedFields.length} key loan terms (lender, loan type, principal, rate, rate type, tenure, processing fee) were clearly stated in the document.`,
  });
  if (foundCount < trackedFields.length - 2) {
    flags.push({
      key: "low_disclosure",
      severity: "caution",
      message: "Several standard loan terms weren't clearly stated in the document — ask the lender to confirm them in writing.",
    });
  }

  // 5. AI-observed red flags from the source text — weight 15
  const aiFlagCount = fields.redFlagsNoted?.length ?? 0;
  const redFlagScore = clamp(15 - aiFlagCount * 4, 0, 15);
  breakdown.push({
    key: "redflags",
    label: "Concerning clauses noted in the text",
    weight: 15,
    score: redFlagScore,
    detail:
      aiFlagCount > 0
        ? `${aiFlagCount} potentially concerning clause(s) noted directly in the document text (see below).`
        : "No obviously concerning clauses were flagged in the document text.",
  });
  for (const note of fields.redFlagsNoted ?? []) {
    flags.push({ key: "text_flag", severity: "warning", message: note });
  }

  const total = breakdown.reduce((sum, b) => sum + b.score, 0);
  const score = Math.round(clamp(total, 0, 100));
  const band = bandFor(score);

  return { score, band, breakdown, flags };
}
