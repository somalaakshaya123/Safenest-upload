/**
 * Financial Health scoring engine — Phase 2.
 *
 * THIS ENTIRE MODULE IS 100% DETERMINISTIC RULE-BASED LOGIC.
 * It calls no LLM, no external API, and no BYOK key. Every number here is
 * produced by fixed formulas and threshold tables defined below, so the
 * same inputs always produce the same output and every result can be
 * explained line-by-line to a user. This is intentional: it keeps the
 * "financial health score" auditable and cannot be mistaken for an
 * AI-generated judgment about someone's creditworthiness.
 *
 * The interest rates in INDICATIVE_ANNUAL_RATES are illustrative planning
 * assumptions only (used to estimate what a new EMI might look like) —
 * NOT an offer, quote, or prediction of any real lender's rate.
 */

export type EmploymentType = "SALARIED" | "SELF_EMPLOYED" | "BUSINESS_OWNER" | "STUDENT" | "UNEMPLOYED";

export type LoanPurpose =
  | "HOME"
  | "VEHICLE"
  | "EDUCATION"
  | "BUSINESS"
  | "PERSONAL"
  | "AGRICULTURE"
  | "MEDICAL"
  | "OTHER";

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  "SALARIED",
  "SELF_EMPLOYED",
  "BUSINESS_OWNER",
  "STUDENT",
  "UNEMPLOYED",
];

export const LOAN_PURPOSES: LoanPurpose[] = [
  "HOME",
  "VEHICLE",
  "EDUCATION",
  "BUSINESS",
  "PERSONAL",
  "AGRICULTURE",
  "MEDICAL",
  "OTHER",
];

export const AGE_BANDS = ["18-25", "26-35", "36-45", "46-60", "60+"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

// Illustrative planning rates only — see module doc comment above.
export const INDICATIVE_ANNUAL_RATES: Record<LoanPurpose, number> = {
  HOME: 8.5,
  VEHICLE: 10,
  EDUCATION: 9,
  BUSINESS: 13,
  PERSONAL: 14,
  AGRICULTURE: 7,
  MEDICAL: 14,
  OTHER: 14,
};

export type FinancialInputs = {
  employmentType: EmploymentType;
  ageBand?: string;
  dependents: number;
  state?: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  existingEMIs: number;
  loanPurpose: LoanPurpose;
  desiredLoanAmount: number;
  desiredTenureMonths: number;
  hasExistingLoanDefault: boolean;
  preferredLanguage?: string;
};

export type ScoreBreakdownItem = {
  key: string;
  label: string;
  weight: number;
  score: number; // 0..weight
  detail: string;
};

export type FinancialHealthResult = {
  score: number; // 0-100, after any penalties, clamped
  band: "Excellent" | "Good" | "Fair" | "At Risk" | "Critical";
  dtiRatio: number; // existingEMIs / income
  emiBurdenRatio: number; // (existingEMIs + estimatedNewEMI) / income
  savingsRatio: number; // (income - expenses - existingEMIs) / income
  estimatedNewEMI: number;
  assumedAnnualRatePct: number;
  breakdown: ScoreBreakdownItem[];
  recommendations: string[];
};

/** Standard reducing-balance EMI formula. */
export function calculateEMI(principal: number, annualRatePct: number, tenureMonths: number): number {
  if (tenureMonths <= 0 || principal <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return principal / tenureMonths;
  const factor = Math.pow(1 + r, tenureMonths);
  return (principal * r * factor) / (factor - 1);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function bandFor(score: number): FinancialHealthResult["band"] {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 45) return "Fair";
  if (score >= 25) return "At Risk";
  return "Critical";
}

export function computeFinancialHealth(input: FinancialInputs): FinancialHealthResult {
  const income = Math.max(input.monthlyIncome, 0);
  const hasIncome = income > 0;

  const dtiRatio = hasIncome ? input.existingEMIs / income : 1;
  const assumedAnnualRatePct = INDICATIVE_ANNUAL_RATES[input.loanPurpose];
  const estimatedNewEMI = calculateEMI(input.desiredLoanAmount, assumedAnnualRatePct, input.desiredTenureMonths);
  const emiBurdenRatio = hasIncome ? (input.existingEMIs + estimatedNewEMI) / income : 1;
  const monthlySavings = income - input.monthlyExpenses - input.existingEMIs;
  const savingsRatio = hasIncome ? monthlySavings / income : -1;

  const breakdown: ScoreBreakdownItem[] = [];

  // 1. Existing debt-to-income ratio — weight 30
  let dtiScore: number;
  if (!hasIncome) dtiScore = 0;
  else if (dtiRatio <= 0.2) dtiScore = 30;
  else if (dtiRatio <= 0.36) dtiScore = 22;
  else if (dtiRatio <= 0.5) dtiScore = 12;
  else dtiScore = 0;
  breakdown.push({
    key: "dti",
    label: "Existing debt-to-income ratio",
    weight: 30,
    score: dtiScore,
    detail: hasIncome
      ? `Your current EMIs use ${(dtiRatio * 100).toFixed(1)}% of monthly income. Lenders generally prefer this under 36%.`
      : "No monthly income was entered, so this could not be assessed.",
  });

  // 2. Affordability of the requested loan — weight 25
  let emiScore: number;
  if (!hasIncome) emiScore = 0;
  else if (emiBurdenRatio <= 0.35) emiScore = 25;
  else if (emiBurdenRatio <= 0.5) emiScore = 17;
  else if (emiBurdenRatio <= 0.65) emiScore = 8;
  else emiScore = 0;
  breakdown.push({
    key: "affordability",
    label: "Affordability of requested loan",
    weight: 25,
    score: emiScore,
    detail: `At an indicative ${assumedAnnualRatePct}% p.a. over ${input.desiredTenureMonths} months, the new EMI is estimated at ₹${Math.round(
      estimatedNewEMI
    ).toLocaleString("en-IN")}, bringing total EMI burden to ~${(emiBurdenRatio * 100).toFixed(1)}% of income.`,
  });

  // 3. Savings ratio — weight 20
  let savingsScore: number;
  if (!hasIncome) savingsScore = 0;
  else if (savingsRatio >= 0.3) savingsScore = 20;
  else if (savingsRatio >= 0.15) savingsScore = 14;
  else if (savingsRatio >= 0.05) savingsScore = 7;
  else savingsScore = 0;
  breakdown.push({
    key: "savings",
    label: "Monthly savings buffer",
    weight: 20,
    score: savingsScore,
    detail: hasIncome
      ? `After expenses and existing EMIs, roughly ${(savingsRatio * 100).toFixed(1)}% of income is left over each month.`
      : "No monthly income was entered, so this could not be assessed.",
  });

  // 4. Employment / income stability — weight 15
  const EMPLOYMENT_SCORES: Record<EmploymentType, number> = {
    SALARIED: 15,
    BUSINESS_OWNER: 12,
    SELF_EMPLOYED: 10,
    STUDENT: 5,
    UNEMPLOYED: 0,
  };
  const employmentScore = EMPLOYMENT_SCORES[input.employmentType];
  breakdown.push({
    key: "employment",
    label: "Income stability",
    weight: 15,
    score: employmentScore,
    detail: `Employment type: ${input.employmentType.replace("_", " ").toLowerCase()}.`,
  });

  // 5. Dependents burden relative to income — weight 10
  const incomePerHead = hasIncome ? income / (input.dependents + 1) : 0;
  let dependentsScore: number;
  if (!hasIncome) dependentsScore = 0;
  else if (incomePerHead >= 25000) dependentsScore = 10;
  else if (incomePerHead >= 12000) dependentsScore = 7;
  else if (incomePerHead >= 6000) dependentsScore = 3;
  else dependentsScore = 0;
  breakdown.push({
    key: "dependents",
    label: "Household support burden",
    weight: 10,
    score: dependentsScore,
    detail: `${input.dependents} dependent(s) supported alongside the account holder, ~₹${Math.round(
      incomePerHead
    ).toLocaleString("en-IN")} of income per household member.`,
  });

  let total = breakdown.reduce((sum, b) => sum + b.score, 0);

  if (input.hasExistingLoanDefault) {
    total = Math.max(0, total - 20);
  }

  const score = Math.round(clamp(total, 0, 100));
  const band = bandFor(score);

  const recommendations: string[] = [];
  if (dtiScore < 22) {
    recommendations.push(
      "Your existing EMI load is high relative to income. Paying down or consolidating existing debt before taking a new loan would improve eligibility."
    );
  }
  if (emiScore < 17) {
    recommendations.push(
      "The requested loan amount or tenure may strain your monthly budget. Consider a smaller amount, a longer tenure, or a larger down payment to lower the EMI."
    );
  }
  if (savingsScore < 14) {
    recommendations.push(
      "Your monthly savings buffer is thin. Building 3-6 months of expenses as an emergency fund reduces the risk of missed payments."
    );
  }
  if (employmentScore < 12) {
    recommendations.push(
      "Lenders weigh income stability heavily. Additional income proof, a co-applicant, or a guarantor can strengthen an application."
    );
  }
  if (dependentsScore < 7) {
    recommendations.push(
      "With household income spread across several dependents, borrowing conservatively and comparing government-backed schemes is worth exploring."
    );
  }
  if (input.hasExistingLoanDefault) {
    recommendations.push(
      "A past loan default was self-reported. Being upfront about this with lenders and asking about rehabilitation or secured-loan options is recommended."
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Your financial profile looks healthy against these indicators. Continue comparing offers to find the lowest fair interest rate."
    );
  }

  return {
    score,
    band,
    dtiRatio,
    emiBurdenRatio,
    savingsRatio,
    estimatedNewEMI,
    assumedAnnualRatePct,
    breakdown,
    recommendations,
  };
}
