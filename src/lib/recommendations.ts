/**
 * Recommendations Aggregator — Phase 4.
 *
 * THIS ENTIRE MODULE IS 100% DETERMINISTIC RULE-BASED LOGIC — it makes no LLM
 * call and uses no BYOK key. It does not compute anything new itself; it only
 * sorts and re-labels output that already came from other fixed-rule engines:
 * the Phase 2 Financial Health recommendations (src/lib/scoring.ts), the
 * Phase 4 scheme matches (src/lib/schemes.ts), and the Phase 4 loan comparison
 * rows (src/lib/loanComparison.ts). Ordering below follows fixed priority
 * bands, not a model's opinion of what matters most.
 */

import type { FinancialHealthResult } from "./scoring";
import type { SchemeMatch } from "./schemes";
import type { ComparisonRow } from "./loanComparison";

export type RecommendationItem = {
  key: string;
  priority: 1 | 2 | 3;
  category: "financial_health" | "scheme" | "comparison";
  title: string;
  detail: string;
  href?: string;
};

function inr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function buildRecommendations(
  financial: FinancialHealthResult,
  schemeMatches: SchemeMatch[],
  comparisonRows: ComparisonRow[]
): RecommendationItem[] {
  const items: RecommendationItem[] = [];

  // Priority 1: financial-health fundamentals, when the score signals real strain.
  if (financial.band === "At Risk" || financial.band === "Critical") {
    for (const [i, rec] of financial.recommendations.entries()) {
      items.push({
        key: `fh_${i}`,
        priority: 1,
        category: "financial_health",
        title: "Fix this before borrowing more",
        detail: rec,
        href: "/financial-health",
      });
    }
  }

  // Priority 2: the strongest government scheme fits.
  const strongMatches = schemeMatches.filter((m) => m.tier === "Likely Eligible").slice(0, 3);
  const fallbackMatches = strongMatches.length > 0 ? [] : schemeMatches.filter((m) => m.tier === "Worth Checking").slice(0, 2);
  for (const match of [...strongMatches, ...fallbackMatches]) {
    items.push({
      key: `scheme_${match.scheme.id}`,
      priority: 2,
      category: "scheme",
      title: `Consider ${match.scheme.shortName}`,
      detail: `${match.scheme.benefitSummary} (${match.matchScore}% match on the details you've shared — ${match.tier.toLowerCase()}).`,
      href: "/schemes?tab=schemes",
    });
  }

  // Priority 3: the cheapest financing route surfaced by the comparison table.
  const indicativeRows = comparisonRows.filter((r) => r.source === "indicative");
  const cheapest = indicativeRows[0]; // buildLoanComparison() already sorts by representative rate ascending
  if (cheapest) {
    items.push({
      key: `cmp_${cheapest.key}`,
      priority: 3,
      category: "comparison",
      title: `${cheapest.label} looks like your cheapest indicative option`,
      detail: `Estimated EMI around ${inr(cheapest.emiLow)}-${inr(cheapest.emiHigh)}/month at ${cheapest.rateLowPct}%-${cheapest.rateHighPct}% p.a. — indicative only, always get a written quote.`,
      href: "/schemes?tab=compare",
    });
  }

  // Priority 3 (again): if the user has a real analyzed document that's actually cheaper than every
  // indicative benchmark, that's worth flagging as a genuinely good sign.
  const analyzedRows = comparisonRows.filter((r) => r.source === "your_analysis");
  const cheapestAnalyzed = analyzedRows[0];
  if (cheapestAnalyzed && (!cheapest || cheapestAnalyzed.representativeRatePct <= cheapest.representativeRatePct)) {
    items.push({
      key: `cmp_${cheapestAnalyzed.key}`,
      priority: 3,
      category: "comparison",
      title: `Your analyzed offer "${cheapestAnalyzed.label}" already looks competitive`,
      detail: `Its extracted rate (${cheapestAnalyzed.rateLowPct}% p.a.) is at or below the indicative benchmarks for this purpose.`,
      href: "/schemes?tab=compare",
    });
  }

  if (items.length === 0) {
    items.push({
      key: "all_clear",
      priority: 3,
      category: "financial_health",
      title: "No urgent flags right now",
      detail: "Your financial health looks steady and no strong scheme match was found for your current answers — revisit this after any change in income, loan purpose, or amount.",
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}
