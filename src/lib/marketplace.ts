/**
 * Borrower–Lender Marketplace matching engine — Phase 5.
 *
 * THIS ENTIRE MODULE IS 100% DETERMINISTIC RULE-BASED LOGIC, same guarantee as
 * scoring.ts / riskEngine.ts / schemes.ts / loanComparison.ts. It calls no LLM
 * and no BYOK key. A LoanOffer is data a lender typed into the "Post an offer"
 * form (or an admin moderated); matchOffer() compares it against a borrower's
 * already-collected FinancialProfile (Phase 2) using fixed rules below and
 * returns a 0-100 score, a tier, and plain-language reasons — every point
 * traces back to a rule in this file, never to a model's judgment.
 */

import type { EmploymentType, LoanPurpose, FinancialInputs } from "./scoring";
import { calculateEMI } from "./scoring";

export const OFFER_CATEGORIES = [
  "PUBLIC_SECTOR_BANK",
  "PRIVATE_BANK",
  "NBFC",
  "FINTECH",
  "GOLD_LOAN",
  "SCHEME_LINKED",
  "OTHER",
] as const;
export type OfferCategory = (typeof OFFER_CATEGORIES)[number];

export const OFFER_CATEGORY_LABELS: Record<OfferCategory, string> = {
  PUBLIC_SECTOR_BANK: "Public Sector Bank",
  PRIVATE_BANK: "Private Bank",
  NBFC: "NBFC",
  FINTECH: "Digital / Fintech Lender",
  GOLD_LOAN: "Gold Loan",
  SCHEME_LINKED: "Government Scheme-Linked",
  OTHER: "Other",
};

export type LoanOfferInput = {
  title: string;
  lenderDisplayName: string;
  category: OfferCategory;
  purposes: LoanPurpose[];
  minAmount: number;
  maxAmount: number;
  minTenureMonths: number;
  maxTenureMonths: number;
  interestRatePct: number;
  processingFeePct: number;
  minIncomeRequired?: number | null;
  eligibleEmploymentTypes?: EmploymentType[] | null;
  excludesIfDefault: boolean;
  description: string;
};

export type LoanOfferRecord = LoanOfferInput & {
  id: string;
  lenderUserId: string;
  status: "ACTIVE" | "PAUSED" | "REMOVED";
  removedReason?: string | null;
  createdAt: Date | string;
};

export type OfferMatch = {
  offer: LoanOfferRecord;
  eligible: boolean;
  matchScore: number;
  tier: "Strong Match" | "Possible Match" | "Not Eligible";
  reasons: string[];
  cautions: string[];
  estimatedEMI: number;
};

/**
 * Scores a single offer against a borrower's profile.
 * Hard disqualifiers (amount out of range, tenure out of range, default
 * exclusion, employment-type restriction) set eligible=false and cap the
 * score. Everything else is a fixed-weight soft signal.
 */
export function matchOffer(offer: LoanOfferRecord, profile: FinancialInputs): OfferMatch {
  const reasons: string[] = [];
  const cautions: string[] = [];
  let eligible = true;
  let score = 50; // baseline before adjustments

  // --- purpose relevance ---
  if (offer.purposes.includes(profile.loanPurpose)) {
    score += 15;
    reasons.push(`Matches your stated loan purpose (${profile.loanPurpose.toLowerCase()}).`);
  } else {
    score -= 10;
    cautions.push("This lender's offer isn't tagged for your stated loan purpose — confirm it applies.");
  }

  // --- amount range ---
  if (profile.desiredLoanAmount < offer.minAmount || profile.desiredLoanAmount > offer.maxAmount) {
    eligible = false;
    score -= 30;
    cautions.push(
      `Your desired amount (₹${profile.desiredLoanAmount.toLocaleString("en-IN")}) is outside this lender's ` +
        `₹${offer.minAmount.toLocaleString("en-IN")}–₹${offer.maxAmount.toLocaleString("en-IN")} range.`
    );
  } else {
    score += 10;
    reasons.push("Your desired loan amount falls within this lender's offered range.");
  }

  // --- tenure range ---
  if (profile.desiredTenureMonths < offer.minTenureMonths || profile.desiredTenureMonths > offer.maxTenureMonths) {
    score -= 10;
    cautions.push(
      `Your desired tenure (${profile.desiredTenureMonths} months) is outside this lender's ` +
        `${offer.minTenureMonths}–${offer.maxTenureMonths} month range — the EMI below assumes their closest tenure.`
    );
  } else {
    score += 5;
    reasons.push("Your desired tenure fits within this lender's offered range.");
  }

  // --- income requirement ---
  if (offer.minIncomeRequired && profile.monthlyIncome < offer.minIncomeRequired) {
    eligible = false;
    score -= 25;
    cautions.push(
      `This lender requires minimum monthly income of ₹${offer.minIncomeRequired.toLocaleString("en-IN")}.`
    );
  } else if (offer.minIncomeRequired) {
    score += 5;
    reasons.push("You meet this lender's stated minimum income requirement.");
  }

  // --- employment type ---
  if (offer.eligibleEmploymentTypes && offer.eligibleEmploymentTypes.length > 0) {
    if (!offer.eligibleEmploymentTypes.includes(profile.employmentType)) {
      eligible = false;
      score -= 25;
      cautions.push("This lender restricts offers to employment types you don't currently have selected.");
    } else {
      score += 5;
      reasons.push("Your employment type is accepted by this lender.");
    }
  }

  // --- existing default ---
  if (offer.excludesIfDefault && profile.hasExistingLoanDefault) {
    eligible = false;
    score -= 30;
    cautions.push("This lender excludes applicants with an existing loan default on record.");
  }

  // --- rate competitiveness (soft signal, not a disqualifier) ---
  if (offer.interestRatePct <= 10) {
    score += 10;
    reasons.push(`Competitive headline rate of ${offer.interestRatePct}% p.a.`);
  } else if (offer.interestRatePct >= 18) {
    score -= 10;
    cautions.push(`High headline rate of ${offer.interestRatePct}% p.a. — compare against other offers before proceeding.`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const tier: OfferMatch["tier"] = !eligible ? "Not Eligible" : score >= 70 ? "Strong Match" : "Possible Match";

  const tenureForEstimate = Math.min(
    Math.max(profile.desiredTenureMonths, offer.minTenureMonths),
    offer.maxTenureMonths
  );
  const amountForEstimate = Math.min(
    Math.max(profile.desiredLoanAmount, offer.minAmount),
    offer.maxAmount
  );
  const estimatedEMI = calculateEMI(amountForEstimate, offer.interestRatePct, tenureForEstimate);

  return { offer, eligible, matchScore: score, tier, reasons, cautions, estimatedEMI };
}

export function matchOffers(offers: LoanOfferRecord[], profile: FinancialInputs): OfferMatch[] {
  return offers
    .filter((o) => o.status === "ACTIVE")
    .map((o) => matchOffer(o, profile))
    .sort((a, b) => b.matchScore - a.matchScore);
}

export const APPLICATION_STATUSES = ["SUBMITTED", "VIEWED", "SHORTLISTED", "REJECTED", "WITHDRAWN"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  SUBMITTED: "Submitted",
  VIEWED: "Viewed by lender",
  SHORTLISTED: "Shortlisted",
  REJECTED: "Not proceeding",
  WITHDRAWN: "Withdrawn by borrower",
};

/** Which status transitions a lender/admin may make from a given current status. */
export function allowedNextStatuses(current: ApplicationStatus): ApplicationStatus[] {
  switch (current) {
    case "SUBMITTED":
      return ["VIEWED", "SHORTLISTED", "REJECTED"];
    case "VIEWED":
      return ["SHORTLISTED", "REJECTED"];
    case "SHORTLISTED":
      return ["REJECTED"];
    default:
      return [];
  }
}
