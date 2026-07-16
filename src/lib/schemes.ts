/**
 * Government Scheme Recommender — Phase 4.
 *
 * THIS ENTIRE MODULE IS 100% DETERMINISTIC RULE-BASED LOGIC, same guarantee as
 * src/lib/scoring.ts and src/lib/riskEngine.ts. It calls no LLM and no BYOK key.
 * GOVT_SCHEMES below is a hardcoded reference catalog of real, publicly-documented
 * Indian government lending/subsidy schemes (name, operating body, and headline
 * terms are general public information, not scraped or AI-generated). matchSchemes()
 * compares a user's already-collected FinancialProfile answers (Phase 2) against
 * each scheme's fixed eligibility rules below and produces a score + reasons —
 * every point traces back to a rule in this file, never to a model's judgment.
 *
 * IMPORTANT LIMITS (surfaced in the UI, not just here):
 * - Scheme terms, income ceilings, and loan caps change over time. This catalog is a
 *   starting-point shortlist, not a live feed — every match includes an
 *   "official info" reminder to verify current terms before applying.
 * - Several real schemes reserve eligibility for categories this app deliberately
 *   does NOT collect in onboarding (e.g. caste/community, gender, disability
 *   status) because SafeNest AI does not ask users for protected attributes.
 *   Where a scheme has such criteria, `additionalCriteriaNote` says so plainly
 *   instead of silently assuming eligibility either way.
 */

import type { EmploymentType, LoanPurpose, FinancialInputs } from "./scoring";

export type SchemeCategory =
  | "MICRO_ENTERPRISE"
  | "AGRICULTURE"
  | "HOUSING"
  | "EDUCATION"
  | "STREET_VENDOR"
  | "ARTISAN_WEAVER"
  | "SELF_HELP_GROUP";

export type GovtScheme = {
  id: string;
  name: string;
  shortName: string;
  operatedBy: string;
  category: SchemeCategory;
  purposes: LoanPurpose[]; // onboarding loanPurpose values this scheme is relevant to
  description: string;
  benefitSummary: string;
  minLoanAmount?: number;
  maxLoanAmount?: number;
  maxAnnualIncome?: number; // income ceiling in ₹/year, undefined = no stated ceiling
  eligibleEmploymentTypes?: EmploymentType[]; // undefined = no restriction in this catalog
  minAge?: number;
  maxAge?: number;
  excludesIfDefault?: boolean; // true = an existing loan default is disqualifying for this scheme
  additionalCriteriaNote?: string;
  officialInfoNote: string;
};

export const GOVT_SCHEMES: GovtScheme[] = [
  {
    id: "pmegp",
    name: "Prime Minister's Employment Generation Programme",
    shortName: "PMEGP",
    operatedBy: "KVIC / Ministry of MSME",
    category: "MICRO_ENTERPRISE",
    purposes: ["BUSINESS"],
    description:
      "Credit-linked capital subsidy for setting up new micro-enterprises in the manufacturing or service sector.",
    benefitSummary: "Government subsidy of 15-35% of project cost; the rest is a bank loan.",
    minLoanAmount: 100000,
    maxLoanAmount: 5000000,
    minAge: 18,
    excludesIfDefault: true,
    additionalCriteriaNote:
      "Higher subsidy tiers apply to special categories (women, SC/ST, ex-servicemen, North-East/hill/border areas) not captured in this profile.",
    officialInfoNote: "Verify current subsidy slabs and project caps on the official KVIC/PMEGP e-portal.",
  },
  {
    id: "mudra",
    name: "Pradhan Mantri Mudra Yojana",
    shortName: "Mudra Yojana",
    operatedBy: "Ministry of Finance / MUDRA Ltd.",
    category: "MICRO_ENTERPRISE",
    purposes: ["BUSINESS"],
    description:
      "Collateral-free loans for non-corporate, non-farm micro and small enterprises, in three tiers: Shishu (up to ₹50,000), Kishor (₹50,000-5 lakh), and Tarun (₹5-10 lakh).",
    benefitSummary: "Collateral-free loan up to ₹10 lakh through banks/NBFCs/MFIs.",
    minLoanAmount: 1000,
    maxLoanAmount: 1000000,
    minAge: 18,
    excludesIfDefault: true,
    officialInfoNote: "Apply through any participating bank, NBFC, or MFI — check current tier limits on mudra.org.in.",
  },
  {
    id: "standup-india",
    name: "Stand-Up India",
    shortName: "Stand-Up India",
    operatedBy: "Department of Financial Services",
    category: "MICRO_ENTERPRISE",
    purposes: ["BUSINESS"],
    description: "Bank loans for setting up a greenfield enterprise in manufacturing, services, or trading.",
    benefitSummary: "Loan between ₹10 lakh and ₹1 crore for a new greenfield project.",
    minLoanAmount: 1000000,
    maxLoanAmount: 10000000,
    minAge: 18,
    excludesIfDefault: true,
    additionalCriteriaNote:
      "Reserved for women entrepreneurs and SC/ST entrepreneurs — categories this app does not collect. Flagged here for purpose/amount fit only; confirm category eligibility yourself.",
    officialInfoNote: "See standupmitra.in for eligibility and empanelled bank branches.",
  },
  {
    id: "pm-vishwakarma",
    name: "PM Vishwakarma Scheme",
    shortName: "PM Vishwakarma",
    operatedBy: "Ministry of MSME",
    category: "ARTISAN_WEAVER",
    purposes: ["BUSINESS"],
    description: "Support for traditional artisans and craftspeople (18 trades) — toolkit incentive plus collateral-free credit.",
    benefitSummary: "Collateral-free loans up to ₹3 lakh across two tranches, at a concessional 5% interest rate.",
    minLoanAmount: 100000,
    maxLoanAmount: 300000,
    minAge: 18,
    excludesIfDefault: true,
    additionalCriteriaNote: "Limited to registered traditional artisan/craft trades — confirm your trade is on the notified list.",
    officialInfoNote: "Register and check the notified trade list at pmvishwakarma.gov.in.",
  },
  {
    id: "pmay-clss",
    name: "Pradhan Mantri Awas Yojana — Credit Linked Subsidy Scheme",
    shortName: "PMAY (CLSS)",
    operatedBy: "Ministry of Housing and Urban Affairs",
    category: "HOUSING",
    purposes: ["HOME"],
    description: "Interest subsidy on home loans for first-time buyers in EWS/LIG/MIG income categories.",
    benefitSummary: "Interest subsidy (historically up to 6.5%) credited upfront against the home loan principal.",
    maxLoanAmount: 20000000,
    maxAnnualIncome: 1800000,
    excludesIfDefault: true,
    additionalCriteriaNote: "Applicant/family must not already own a pucca house anywhere in India — verify current scheme status before applying.",
    officialInfoNote: "PMAY-Urban CLSS component has had periodic pauses/renewals — confirm current availability on pmaymis.gov.in.",
  },
  {
    id: "kcc",
    name: "Kisan Credit Card",
    shortName: "Kisan Credit Card (KCC)",
    operatedBy: "NABARD / participating banks",
    category: "AGRICULTURE",
    purposes: ["AGRICULTURE"],
    description: "Short-term working-capital credit for cultivation, post-harvest expenses, and allied agricultural activities.",
    benefitSummary: "Interest subvention brings the effective rate to around 4% p.a. on prompt repayment, up to ₹3 lakh.",
    minLoanAmount: 10000,
    maxLoanAmount: 300000,
    minAge: 18,
    maxAge: 75,
    excludesIfDefault: true,
    officialInfoNote: "Apply at any participating bank/cooperative branch — confirm current interest-subvention rate with the branch.",
  },
  {
    id: "agri-interest-subvention",
    name: "Modified Interest Subvention Scheme (Agriculture)",
    shortName: "Agri Interest Subvention",
    operatedBy: "Ministry of Agriculture & Farmers Welfare",
    category: "AGRICULTURE",
    purposes: ["AGRICULTURE"],
    description: "Interest subvention on short-term crop loans up to ₹3 lakh, on top of/complementing KCC.",
    benefitSummary: "2% interest subvention plus an additional 3% prompt-repayment incentive.",
    minLoanAmount: 10000,
    maxLoanAmount: 300000,
    excludesIfDefault: true,
    officialInfoNote: "Usually applied automatically by the lending bank at disbursal — confirm it has been applied to your account.",
  },
  {
    id: "education-csis",
    name: "Central Sector Interest Subsidy Scheme",
    shortName: "Education CSIS",
    operatedBy: "Ministry of Education",
    category: "EDUCATION",
    purposes: ["EDUCATION"],
    description: "Full interest subsidy during the moratorium period (course duration + up to 1 year) on education loans for technical/professional courses in India.",
    benefitSummary: "Government pays the interest that would otherwise accrue during study + 1 year, for eligible income groups.",
    maxLoanAmount: 750000,
    maxAnnualIncome: 450000,
    officialInfoNote: "Apply via the Vidya Lakshmi portal at the time of taking the education loan, not after.",
  },
  {
    id: "pm-svanidhi",
    name: "PM Street Vendor's AtmaNirbhar Nidhi",
    shortName: "PM SVANidhi",
    operatedBy: "Ministry of Housing and Urban Affairs",
    category: "STREET_VENDOR",
    purposes: ["BUSINESS", "PERSONAL"],
    description: "Working-capital microloans for urban street vendors, in escalating tranches on timely repayment.",
    benefitSummary: "First loan up to ₹10,000, then ₹20,000, then ₹50,000, with interest subsidy on timely repayment.",
    minLoanAmount: 10000,
    maxLoanAmount: 50000,
    minAge: 18,
    excludesIfDefault: true,
    additionalCriteriaNote: "Applicant must be a vendor certified/identified under an urban local body survey.",
    officialInfoNote: "Apply through the PM SVANidhi portal or your urban local body — pmsvanidhi.mohua.gov.in.",
  },
  {
    id: "shg-bank-linkage",
    name: "NABARD Self-Help Group Bank Linkage Programme",
    shortName: "SHG-Bank Linkage",
    operatedBy: "NABARD",
    category: "SELF_HELP_GROUP",
    purposes: ["BUSINESS", "AGRICULTURE", "PERSONAL"],
    description: "Collateral-free credit to women's/rural Self-Help Groups, scaled to group savings history.",
    benefitSummary: "Bank credit at 4x-10x the group's accumulated savings, often at concessional rates for women SHGs.",
    minLoanAmount: 10000,
    maxLoanAmount: 1000000,
    excludesIfDefault: true,
    additionalCriteriaNote: "Requires membership in an existing (or newly formed) Self-Help Group with a savings track record — this is a group-lending route, not an individual loan.",
    officialInfoNote: "Contact your nearest NABARD-linked bank branch or rural livelihood mission office to join or form an SHG.",
  },
  {
    id: "cgtmse",
    name: "Credit Guarantee Fund Trust for Micro and Small Enterprises",
    shortName: "CGTMSE",
    operatedBy: "Ministry of MSME / SIDBI",
    category: "MICRO_ENTERPRISE",
    purposes: ["BUSINESS"],
    description: "Not a loan itself — a government-backed guarantee that lets banks extend collateral-free credit to MSMEs.",
    benefitSummary: "Enables collateral-free/third-party-guarantee-free loans up to ₹5 crore through participating lenders.",
    minLoanAmount: 100000,
    maxLoanAmount: 50000000,
    excludesIfDefault: true,
    officialInfoNote: "Ask your bank whether they lend under CGTMSE cover before offering collateral — not all branches opt in by default.",
  },
];

export type SchemeTier = "Likely Eligible" | "Worth Checking" | "Unlikely Fit";

export type SchemeMatch = {
  scheme: GovtScheme;
  matchScore: number; // 0-100
  tier: SchemeTier;
  reasons: string[];
  cautions: string[];
};

function tierFor(score: number): SchemeTier {
  if (score >= 70) return "Likely Eligible";
  if (score >= 40) return "Worth Checking";
  return "Unlikely Fit";
}

function ageBandOverlap(ageBand: string | undefined, minAge?: number, maxAge?: number): boolean {
  if (!ageBand) return true; // unknown = don't penalize
  if (minAge == null && maxAge == null) return true;
  const bandRanges: Record<string, [number, number]> = {
    "18-25": [18, 25],
    "26-35": [26, 35],
    "36-45": [36, 45],
    "46-60": [46, 60],
    "60+": [60, 100],
  };
  const range = bandRanges[ageBand];
  if (!range) return true;
  const [bandLow, bandHigh] = range;
  const lo = minAge ?? 0;
  const hi = maxAge ?? 200;
  return bandHigh >= lo && bandLow <= hi;
}

/**
 * Scores one scheme against the user's profile. Every branch below is a fixed,
 * named rule — nothing here is inferred by a model.
 */
function scoreScheme(scheme: GovtScheme, profile: FinancialInputs): SchemeMatch {
  const reasons: string[] = [];
  const cautions: string[] = [];
  let score = 0;

  // 1. Purpose match — worth 40 points, and effectively gates relevance.
  const purposeMatches = scheme.purposes.includes(profile.loanPurpose);
  if (purposeMatches) {
    score += 40;
    reasons.push(`Matches your stated loan purpose (${profile.loanPurpose.toLowerCase()}).`);
  } else {
    cautions.push(`This scheme is aimed at ${scheme.purposes.join("/").toLowerCase()} loans, not ${profile.loanPurpose.toLowerCase()}.`);
  }

  // 2. Loan amount fit — worth 20 points.
  const amount = profile.desiredLoanAmount;
  const min = scheme.minLoanAmount ?? 0;
  const max = scheme.maxLoanAmount ?? Number.POSITIVE_INFINITY;
  if (amount >= min && amount <= max) {
    score += 20;
    reasons.push(`Your requested amount fits this scheme's typical range.`);
  } else if (amount < min) {
    score += 8;
    cautions.push(`Your requested amount is below this scheme's usual minimum (~₹${min.toLocaleString("en-IN")}).`);
  } else {
    score += 4;
    cautions.push(`Your requested amount exceeds this scheme's usual cap (~₹${max.toLocaleString("en-IN")}) — you may need to scale down or combine with another source.`);
  }

  // 3. Income ceiling — worth 15 points (only schemes with a stated ceiling check this).
  if (scheme.maxAnnualIncome != null) {
    const annualIncome = profile.monthlyIncome * 12;
    if (annualIncome <= scheme.maxAnnualIncome) {
      score += 15;
      reasons.push(`Your annual income is within this scheme's ₹${scheme.maxAnnualIncome.toLocaleString("en-IN")} ceiling.`);
    } else {
      cautions.push(`Your estimated annual income is above this scheme's ₹${scheme.maxAnnualIncome.toLocaleString("en-IN")} ceiling.`);
    }
  } else {
    score += 15; // no stated ceiling in this catalog — don't penalize
  }

  // 4. Employment type fit — worth 10 points (only schemes with a restriction check this).
  if (scheme.eligibleEmploymentTypes && scheme.eligibleEmploymentTypes.length > 0) {
    if (scheme.eligibleEmploymentTypes.includes(profile.employmentType)) {
      score += 10;
      reasons.push(`Open to your employment type (${profile.employmentType.replace("_", " ").toLowerCase()}).`);
    } else {
      cautions.push(`Typically aimed at ${scheme.eligibleEmploymentTypes.join("/").toLowerCase()} applicants.`);
    }
  } else {
    score += 10;
  }

  // 5. Age band overlap — worth 10 points.
  if (ageBandOverlap(profile.ageBand, scheme.minAge, scheme.maxAge)) {
    score += 10;
  } else {
    cautions.push(
      `Age requirement (${scheme.minAge ?? "any"}${scheme.maxAge ? `-${scheme.maxAge}` : "+"}) may not match your age band.`
    );
  }

  // 6. Existing default — worth 5 points, hard-caps schemes that explicitly exclude defaulters.
  if (scheme.excludesIfDefault && profile.hasExistingLoanDefault) {
    cautions.push("A self-reported past loan default may disqualify you from this government-backed scheme — check with the lender.");
  } else {
    score += 5;
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return {
    scheme,
    matchScore: clamped,
    tier: tierFor(clamped),
    reasons,
    cautions,
  };
}

/** Returns every scheme scored against the profile, sorted best-match first. */
export function matchSchemes(profile: FinancialInputs): SchemeMatch[] {
  return GOVT_SCHEMES.map((scheme) => scoreScheme(scheme, profile)).sort((a, b) => b.matchScore - a.matchScore);
}
