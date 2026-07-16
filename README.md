# SafeNest AI

A secure, multilingual financial-wellness and anti-predatory-lending platform for Indian
borrowers. Built for **System Siege**.

> **Status: Phase 5 of 5 (final) — complete.** Scaffold, authentication, BYOK AI configuration,
> persona onboarding, the deterministic Financial Health Analyzer, the AI-powered Loan Document
> Analyzer with its transparent Risk Engine, the rule-based Recommendations / Government Scheme
> Recommender / Loan Comparison hub, the Borrower–Lender Marketplace, the Admin Panel, and static
> multilingual UI dictionaries are all implemented. See [What's new in Phase 5](#whats-new-in-phase-5) below.

## What's new in Phase 5

Three additions, all **rule-based / deterministic — no LLM or BYOK call anywhere in Phase 5.**

- **Borrower–Lender Marketplace** (`/marketplace`, `src/lib/marketplace.ts`): lenders (role
  `LENDER`) post loan product listings — amount/tenure ranges, headline rate, processing fee,
  income and employment-type eligibility, default exclusion — from a UI form
  (`/marketplace/offers/new`). Borrowers see active listings scored against their Phase 2
  `FinancialProfile` by `matchOffer()`/`matchOffers()`, a fixed-weight rule engine (purpose match,
  amount/tenure range, income floor, employment-type restriction, default exclusion as hard
  disqualifiers; rate competitiveness as a soft signal) that returns a 0-100 match score, a tier
  (*Strong Match / Possible Match / Not Eligible*), and plain-language reasons/cautions — same
  pattern as `schemes.ts`. Borrowers apply with an optional message; the match score at time of
  application is stored for the lender's reference. Lenders manage applications through a simple,
  fixed state machine (`SUBMITTED → VIEWED → SHORTLISTED / REJECTED`, or borrower-initiated
  `WITHDRAWN`) enforced server-side in `allowedNextStatuses()` — see
  `src/app/api/marketplace/**`.
- **Admin Panel** (`/admin`, `ADMIN` role only, enforced in `src/middleware.ts` and every
  `src/app/api/admin/**` route via `getAdminSession()`): platform stats, a user directory with
  enable/disable (blocks login immediately via the existing `isDisabled` check in
  `/api/auth/login`), and marketplace moderation (pause/reactivate/remove any lender's listing,
  with a required reason on removal). An audit-log viewer surfaces the existing `AuditLog` table
  (already populated by every phase since Phase 1) instead of introducing a second logging system.
  All admin actions are themselves audit-logged.
- **Static multilingual UI dictionaries** (`src/lib/i18n/`): hand-written, deterministic
  key→string lookup tables for English, Simple English, Tamil, Hindi, Telugu, and Malayalam (the
  same six codes `FinancialProfile.preferredLanguage` already accepted since Phase 2). A
  `LangProvider` React context (seeded server-side from the signed-in user's saved
  `preferredLang`, `src/app/layout.tsx`) exposes a `useLang()`/`t()` hook; the sidebar's language
  switcher persists the choice via `POST /api/settings/language`. **Coverage in this build is
  navigation, common actions, and the Dashboard/Marketplace/Admin headings** — it is explicitly
  *not* a translation of every page's body copy (financial-health breakdowns, loan-analysis
  output, scheme descriptions remain English-only), and the four non-English dictionaries have
  **not** been reviewed by a native speaker; treat them as a scaffold to extend, not
  production-ready copy. This is a deliberately different feature from the AI-powered
  "multilingual rewriting" required elsewhere in the compliance spec — rewriting arbitrary
  loan-document text into another language would need a real BYOK model call and is out of scope
  for this static UI dictionary.

### Phase 5 data model additions

- `LoanOffer` — a lender-authored listing (`src/prisma/schema.prisma`). Every field is typed in by
  the lender through the UI; nothing here is AI-generated.
- `LoanApplication` — a borrower's application against an offer, including the deterministic
  `matchScore` captured at submission time and a fixed `status` state machine.

### Phase 5 demo accounts (seeded by `npm run prisma:seed`)

- Admin: `admin@safenest.ai` / `Admin@1234`
- Demo lender (with two pre-seeded marketplace offers): `lender@safenest.ai` / `Lender@1234`

## Roadmap

| Phase | Scope |
|---|---|
| 1 ✅ | Scaffold, auth (signup/login/OTP/session), BYOK AI settings |
| 2 ✅ | Persona onboarding wizard + deterministic Financial Health Analyzer |
| 3 ✅ | Loan Document Analyzer — real BYOK-powered LLM extraction + transparent Risk Engine |
| 4 ✅ | Recommendation Engine + Government Scheme Recommender + Loan Comparison (rule-based, labeled) |
| 5 ✅ | Borrower–Lender Marketplace, Admin Panel, static multilingual UI dictionaries — all rule-based |

## What's new in Phase 4

`/schemes` is a three-tab hub — **Recommendations**, **Government Schemes**, and **Loan
Comparison** — all fed by rule-based engines that read the Phase 2 financial profile (and, where
available, Phase 3 analyzed loan documents). **No LLM/BYOK call happens anywhere in Phase 4.**

- **Government Scheme Recommender** (`src/lib/schemes.ts`): a hardcoded catalog of 11 real,
  publicly-documented Indian government lending/subsidy schemes (PMEGP, Mudra Yojana, Stand-Up
  India, PM Vishwakarma, PMAY-CLSS, Kisan Credit Card, agri interest subvention, education-loan
  CSIS, PM SVANidhi, NABARD SHG-Bank Linkage, CGTMSE). `matchSchemes()` scores each one against
  the user's onboarding answers (loan purpose, amount, income, employment type, age band,
  existing-default flag) using fixed weighted rules, and returns a 0-100 match score, a tier
  (*Likely Eligible / Worth Checking / Unlikely Fit*), and plain-language reasons *and* cautions.
  Schemes with eligibility criteria this app doesn't collect (e.g. category or gender-reserved
  schemes) say so explicitly in `additionalCriteriaNote` rather than silently assuming a fit —
  SafeNest AI does not ask users for protected attributes. Every scheme carries an
  `officialInfoNote` reminding the user to verify current terms before applying.
- **Loan Comparison** (`src/lib/loanComparison.ts`): a fixed table of illustrative rate/fee ranges
  across six lender categories (Public Sector Bank, Private Bank, NBFC, Digital/Fintech Lender,
  Gold Loan, Government Scheme-Linked Loan), run through the same `calculateEMI()` reducing-balance
  formula from `src/lib/scoring.ts` against the user's desired loan amount and tenure. Where the
  user has real analyzed loan documents from Phase 3, their AI-extracted numbers (principal, rate,
  tenure) are added as extra rows — clearly badged **"Your analyzed document"** — so a real offer
  can be lined up next to the indicative benchmarks. All rows are sorted cheapest-rate-first.
- **Recommendations** (`src/lib/recommendations.ts`): a pure aggregator/sorter — it computes
  nothing new, it just prioritizes output already produced by the Phase 2 scoring engine, the
  scheme matcher, and the comparison table into a single ranked list (fix financial-health issues
  first, then strong scheme matches, then the cheapest financing route).
- Every card and disclosure banner on `/schemes` names the exact rule-engine file responsible, same
  disclosure pattern as Phases 2 and 3.

## What's new in Phase 3

`/loans` lets a user paste (or upload a `.txt`) a loan offer, sanction letter, or agreement.
Submitting it makes a **real, live call to the user's own BYOK-configured LLM**
(`src/lib/ai/loanExtraction.ts`) to extract structured terms — lender, principal, interest rate
and type, effective APR, tenure, processing fee, prepayment penalty, bundled insurance, other
fees, and any concerning clauses noted directly in the text — plus a plain-language summary.

Those extracted numbers are then run through `computeLoanRisk()`, a **separate, fixed rule engine**
in `src/lib/riskEngine.ts` (rate-vs-market-range, nominal-vs-APR gap, fee/penalty load, disclosure
completeness, flagged-clause count) that produces a 0–100 score sharing the exact band thresholds
and gauge component as the Phase 2 Financial Health score. The AI is instructed never to output a
risk judgment itself — extraction and scoring are kept in two auditable, separately-labeled steps,
each carrying its own "Powered by `<provider>/<model>`" or "rule-based" disclosure in the UI.
Failed AI calls or unparseable responses are saved as a clearly-marked `FAILED` analysis with a
re-analyze option, rather than silently showing a wrong result.

## What's new in Phase 2

A 5-step onboarding wizard (`/onboarding`) collects employment type, household size, income,
expenses, existing EMIs, and the loan the person is considering. Submitting it runs a
**deterministic, rule-based** scoring engine (`src/lib/scoring.ts`) — five weighted checks
(debt-to-income, new-loan affordability, savings buffer, income stability, household burden),
each with a fixed formula and threshold table — and produces a 0–100 Financial Health score with
a full breakdown and plain-language recommendations, shown at `/financial-health`.

**Compliance note:** this module makes **zero calls to any LLM or BYOK key.** The `/financial-health`
page carries an explicit "rule-based, not AI" disclosure banner, and every number traces back to a
named formula in `scoring.ts`, so it can't be mistaken for an AI-generated assessment. The
indicative interest rates used to estimate a new loan's EMI are clearly labeled as planning
assumptions only, not a real lender offer.

The dashboard roadmap and sidebar now reflect real completion state (profile saved → ✓, with a
live score summary card linking through to the full breakdown).

## BYOK Disclosure (required by the rulebook)

SafeNest AI does **not** ship with any bundled or hardcoded LLM API key, and no AI-labeled
feature uses hardcoded/mocked logic disguised as AI. Every component that invokes a generative
model:

- Is configured entirely from the app UI at **Settings → AI Configuration** (`/settings/ai`) —
  no code or `.env` edits required.
- Lets the user pick **provider** (`openai`, `anthropic`, or any `openai_compatible` endpoint),
  **model name**, and paste their **own API key**.
- Stores that key **encrypted at rest** (AES-256-GCM, keyed off `AI_KEY_ENCRYPTION_SECRET`) and
  scoped to the account that entered it — it is never written to source, logs, or `.env`.
- Includes a **"Test connection"** button that makes a real call to the configured provider so
  evaluators can confirm their key works before relying on it.
- The provider + model actually used are surfaced back in the UI wherever AI output is shown
  (`Powered by <provider>/<model>`), so nothing is presented as AI without disclosure.

Deterministic, rule-based modules — financial scoring formulas (`scoring.ts`), loan risk scoring
(`riskEngine.ts`), government scheme matching (`schemes.ts`), loan comparison (`loanComparison.ts`),
and the recommendations aggregator (`recommendations.ts`) — are explicitly labeled **"rule-based,
not AI"** in the UI, naming the exact source file, and are never presented as AI-generated. This
keeps them compliant with the "no rule-based logic disguised as AI" clause.

## Tech Stack (Phase 1–3)

- **Frontend:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Lucide icons
- **Backend:** Next.js API routes
- **Database:** SQLite via Prisma (file-based — zero external DB server to stand up, so judges
  can run it in seconds; swap `provider`/`url` in `prisma/schema.prisma` for Postgres later
  without touching application code)
- **Auth:** bcrypt password hashing, JWT session cookie (httpOnly, signed with `jose`), mock-OTP
  demo-mode flow (clearly labeled — no SMS/email provider wired up for the hackathon; the code
  path is real, only the delivery channel is mocked, and this is **not** an AI feature so it is
  outside the BYOK requirement)
- **Validation:** Zod on every form/API boundary
- **Security:** rate limiting on login/OTP/signup, audit logging on sensitive actions, AES-256-GCM
  encryption for stored AI keys, role-based route protection via middleware
- **Scoring:** `src/lib/scoring.ts` — pure, dependency-free deterministic functions (standard
  reducing-balance EMI formula + weighted rule table), unit-testable in isolation, no network calls
- **Charts:** Recharts `RadialBarChart` for the Financial Health gauge

## Setup (local dev, ~2 minutes)

```bash
npm install
cp .env.example .env
# edit .env: set SESSION_SECRET and AI_KEY_ENCRYPTION_SECRET to any long random strings
npx prisma db push
npm run prisma:seed   # optional — creates admin@safenest.ai / Admin@1234
npm run dev
```

Open http://localhost:3000. Sign up as a Borrower or Lender, complete the OTP step (code is
shown on-screen in demo mode), then either:

- go to **Settings → AI Configuration** and paste your own OpenAI/Anthropic/compatible API key
  to light up AI features as later phases land, or
- go to **Financial Health → Start the questionnaire** to complete the persona wizard and get
  your rule-based Financial Health score immediately (no API key needed for this part).

No external services, Docker, or cloud DB are required to run Phase 1 or 2 locally.

## Project Structure

```
src/
  app/
    page.tsx                 # Landing page
    (auth)/signup, login, verify-otp
    dashboard/                # Authenticated shell + roadmap (now reflects real completion state)
    settings/ai/               # BYOK configuration UI
    onboarding/                # Phase 2: 5-step persona/financial wizard
    financial-health/          # Phase 2: score dashboard (rule-based, disclosed as such)
    schemes/                   # Phase 4: Recommendations / Govt Schemes / Loan Comparison hub (3 tabs)
    marketplace/                # Phase 5: Borrower–Lender Marketplace (rule-based matching)
      offers/new/page.tsx        # Lender: post-offer form
      offers/[id]/page.tsx       # Offer detail + lender application inbox
    admin/                     # Phase 5: Admin Panel (ADMIN role only)
      users/page.tsx             # Enable/disable accounts, view roles
      offers/page.tsx             # Marketplace moderation
      audit-logs/page.tsx         # Audit log viewer
    api/
      auth/                   # signup, login, logout, verify-otp, session
      settings/ai/             # BYOK CRUD + live connection test
      settings/language/       # Phase 5: save preferredLang (static dictionary lookup, no AI)
      onboarding/              # Phase 2: save wizard answers, run scoring engine, return result
      loans/                    # Phase 3: create/list/get/re-analyze/delete a loan document analysis
        [id]/route.ts           # GET detail, POST re-analyze, DELETE
        route.ts                 # GET list, POST new analysis (calls BYOK key)
      schemes/route.ts           # Phase 4: GET government scheme matches for the current profile
      compare/route.ts           # Phase 4: GET lender comparison table (+ any analyzed documents)
      recommendations/route.ts   # Phase 4: GET aggregated, prioritized recommendation list
      marketplace/                # Phase 5: offers (list/create/update/delete) + applications (list/create/status)
      admin/                       # Phase 5: stats, users, offers (moderation), audit-logs — ADMIN only
    loans/                     # Phase 3: paste/upload UI + list + detail views
      [id]/page.tsx             # Extraction, plain summary, risk breakdown, red flags
      page.tsx                   # Paste/upload form + past analyses list
  components/
    ScoreGauge.tsx             # Phase 2: recharts radial gauge, reused at two sizes; also used by Phase 3 risk score
  lib/
    db.ts                    # Prisma client singleton
    auth.ts                  # session/JWT + bcrypt helpers
    crypto.ts                # AES-256-GCM encrypt/decrypt for stored API keys
    security.ts               # audit log, OTP generator, rate limiter
    validation.ts             # Zod schemas (incl. onboardingSchema, loanAnalysisSchema)
    scoring.ts                 # Phase 2: deterministic Financial Health scoring engine — no AI
    riskEngine.ts               # Phase 3: deterministic Loan Risk scoring engine — no AI, runs on AI-extracted numbers
    schemes.ts                  # Phase 4: deterministic govt scheme catalog + matchSchemes() — no AI
    loanComparison.ts            # Phase 4: deterministic lender rate table + buildLoanComparison() — no AI
    recommendations.ts           # Phase 4: deterministic aggregator/sorter over the above — no AI
    marketplace.ts                # Phase 5: deterministic offer↔borrower matching engine — no AI
    i18n/                          # Phase 5: static UI dictionaries (en, en-simple, ta, hi, te, ml) — no AI
    ai/client.ts               # BYOK-aware multi-provider LLM client
    ai/loanExtraction.ts        # Phase 3: the ONLY module that makes a live LLM call, using the user's own key
  middleware.ts               # route protection (dashboard/settings/onboarding/financial-health/loans/schemes/etc.)
prisma/schema.prisma          # User, AISettings, FinancialProfile, LoanDocument, AuditLog models
```

## Phase 3 — Loan Document Analyzer

**Checkpoint:** Settings → AI Configuration (from Phase 1) → paste or upload a loan offer/agreement at `/loans` → real AI-backed extraction + a transparent, deterministic Risk score.

- **`POST /api/loans`** persists the pasted text immediately (status `PENDING`), then calls `extractLoanFields()` in `src/lib/ai/loanExtraction.ts`, which decrypts the user's stored BYOK key and calls their configured provider/model through the same `src/lib/ai/client.ts` abstraction used by the Phase 1 "Test Connection" button. The AI is instructed to return **only** structured JSON (lender, principal, rate, fees, tenure, etc.) plus a plain-language summary — it is explicitly told **not** to judge risk.
- The extracted numbers are then fed into `computeLoanRisk()` in `src/lib/riskEngine.ts` — a fixed, hardcoded rule engine (interest-rate-vs-market-range, nominal-vs-APR gap, fee/penalty load, disclosure completeness, and AI-noted clause count) that produces a 0-100 score and band using the **same thresholds** as the Phase 2 Financial Health score, so `<ScoreGauge />` and the band colors are shared across both features.
- If the AI call or JSON parsing fails, the document is saved with status `FAILED` and a clear error message instead of a silent bad result; re-analysis is available from the detail page.
- Every AI-generated field in the UI (extraction values, plain summary) sits under a **"Powered by `<provider>/<model>`"** disclosure; every risk-score element sits under a separate disclosure naming `riskEngine.ts` as the source — so a judge can see exactly which parts are AI output and which are fixed formulas.
- A per-user rate limit (10 analyses / 10 minutes) guards against runaway calls against someone's own paid key from accidental double-submits.
- No PDF/OCR parsing library is bundled (no network access in this build environment to install/verify one) — paste, or upload a `.txt`/`.md` file, which is read client-side via `FileReader` before being sent as plain text. Swapping in real PDF extraction for Phase 4+ is a drop-in addition to `/loans/page.tsx`'s upload handler.

## Phase 4 — Recommendations, Government Schemes & Loan Comparison

**Checkpoint:** Complete the Phase 2 questionnaire (if not already) → open `/schemes` from the
sidebar → see persona-based government scheme matches and a lender comparison table, with a
combined recommendations tab on top. Optionally analyze a loan document at `/loans` first — it
will show up as an extra row in the Loan Comparison tab.

- **`GET /api/schemes`** loads the user's `FinancialProfile` and runs `matchSchemes()` — no request
  body, no AI call, purely a read + deterministic compute.
- **`GET /api/compare`** loads the profile plus any `ANALYZED` `LoanDocument` rows, parses their
  already-extracted JSON, and runs `buildLoanComparison()`.
- **`GET /api/recommendations`** re-hydrates the cached Phase 2 score (no rescoring), calls
  `matchSchemes()` and `buildLoanComparison()` again, and feeds all three into
  `buildRecommendations()` for a single prioritized list.
- The `/schemes` page fetches all three in parallel and renders them as tabs, deep-linkable via
  `?tab=recommendations|schemes|compare` (the Recommendations tab's own links use this to jump
  straight to the relevant tab).
- If the user hasn't completed onboarding yet, `/schemes` shows the same "complete your profile
  first" prompt pattern as `/financial-health`, instead of a broken or empty page.

## Future Production Hardening (beyond hackathon scope)

- Swap SQLite → managed Postgres; add Redis for OTP/session throttling at scale
- Real SMS/email OTP provider instead of demo-mode on-screen code
- Refresh-token rotation instead of single long-lived session JWT
- File-upload virus scanning + stricter MIME validation for loan document uploads
- Per-provider key rotation reminders and usage/cost dashboards for BYOK keys
- Formal penetration test before handling real financial documents in production
- Native-speaker review and full page-body coverage for the Tamil/Hindi/Telugu/Malayalam UI
  dictionaries introduced in Phase 5 (currently nav/common/headings only — see
  [What's new in Phase 5](#whats-new-in-phase-5))
- Marketplace: lender KYC/verification, in-app messaging, document exchange, and rate-change
  history instead of a single mutable headline rate
