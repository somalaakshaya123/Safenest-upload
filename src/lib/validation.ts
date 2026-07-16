import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Enter a valid 10-digit phone number")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number"),
  role: z.enum(["BORROWER", "LENDER"]).default("BORROWER"),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: "You must accept the privacy notice to continue" }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const otpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "OTP must be 6 digits"),
});

export const onboardingSchema = z.object({
  employmentType: z.enum(["SALARIED", "SELF_EMPLOYED", "BUSINESS_OWNER", "STUDENT", "UNEMPLOYED"]),
  ageBand: z.enum(["18-25", "26-35", "36-45", "46-60", "60+"]).optional(),
  dependents: z.coerce.number().int().min(0, "Cannot be negative").max(20, "Enter a realistic number"),
  state: z.string().max(100).optional().or(z.literal("")),
  monthlyIncome: z.coerce.number().min(0, "Cannot be negative").max(100_000_000, "Enter a realistic amount"),
  monthlyExpenses: z.coerce.number().min(0, "Cannot be negative").max(100_000_000, "Enter a realistic amount"),
  existingEMIs: z.coerce.number().min(0, "Cannot be negative").max(100_000_000, "Enter a realistic amount"),
  loanPurpose: z.enum(["HOME", "VEHICLE", "EDUCATION", "BUSINESS", "PERSONAL", "AGRICULTURE", "MEDICAL", "OTHER"]),
  desiredLoanAmount: z.coerce.number().min(1, "Enter the loan amount you're considering").max(1_000_000_000),
  desiredTenureMonths: z.coerce.number().int().min(1, "Enter a tenure in months").max(480, "Enter a realistic tenure"),
  hasExistingLoanDefault: z.boolean().default(false),
  preferredLanguage: z.enum(["en", "en-simple", "ta", "hi", "te", "ml"]).default("en"),
});

export const aiSettingsSchema = z.object({
  provider: z.enum(["openai", "anthropic", "openai_compatible"]),
  baseUrl: z.string().url().optional().or(z.literal("")),
  model: z.string().min(1, "Model name is required"),
  apiKey: z.string().min(10, "API key looks too short"),
});

export const loanAnalysisSchema = z.object({
  title: z.string().max(150).optional().or(z.literal("")),
  rawText: z
    .string()
    .min(40, "Paste more of the loan document — at least a few sentences are needed to analyze it.")
    .max(20000, "That's a lot of text — please paste the key loan terms sections (under 20,000 characters)."),
});

export const loanOfferSchema = z.object({
  title: z.string().min(4, "Give the offer a short title").max(120),
  lenderDisplayName: z.string().min(2, "Enter a display name borrowers will see").max(120),
  category: z.enum(["PUBLIC_SECTOR_BANK", "PRIVATE_BANK", "NBFC", "FINTECH", "GOLD_LOAN", "SCHEME_LINKED", "OTHER"]),
  purposes: z.array(z.enum(["HOME", "VEHICLE", "EDUCATION", "BUSINESS", "PERSONAL", "AGRICULTURE", "MEDICAL", "OTHER"])).min(1, "Select at least one loan purpose"),
  minAmount: z.coerce.number().min(1000, "Enter a realistic minimum amount"),
  maxAmount: z.coerce.number().min(1000, "Enter a realistic maximum amount"),
  minTenureMonths: z.coerce.number().int().min(1).max(480),
  maxTenureMonths: z.coerce.number().int().min(1).max(480),
  interestRatePct: z.coerce.number().min(0, "Cannot be negative").max(60, "Enter a realistic annual rate"),
  processingFeePct: z.coerce.number().min(0).max(20).default(0),
  minIncomeRequired: z.coerce.number().min(0).optional().or(z.literal("")),
  eligibleEmploymentTypes: z.array(z.enum(["SALARIED", "SELF_EMPLOYED", "BUSINESS_OWNER", "STUDENT", "UNEMPLOYED"])).optional(),
  excludesIfDefault: z.boolean().default(true),
  description: z.string().min(20, "Describe the offer in a bit more detail (at least 20 characters)").max(2000),
}).refine((d) => d.maxAmount >= d.minAmount, {
  message: "Maximum amount must be greater than or equal to minimum amount",
  path: ["maxAmount"],
}).refine((d) => d.maxTenureMonths >= d.minTenureMonths, {
  message: "Maximum tenure must be greater than or equal to minimum tenure",
  path: ["maxTenureMonths"],
});

export const loanApplicationSchema = z.object({
  offerId: z.string().min(1),
  message: z.string().max(1000).optional().or(z.literal("")),
});

export const applicationStatusUpdateSchema = z.object({
  status: z.enum(["VIEWED", "SHORTLISTED", "REJECTED", "WITHDRAWN"]),
  lenderNote: z.string().max(1000).optional().or(z.literal("")),
});

export const adminUserUpdateSchema = z.object({
  isDisabled: z.boolean().optional(),
  role: z.enum(["BORROWER", "LENDER", "ADMIN"]).optional(),
});

export const adminOfferModerationSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "REMOVED"]),
  removedReason: z.string().max(500).optional().or(z.literal("")),
});

export const languagePrefSchema = z.object({
  preferredLanguage: z.enum(["en", "en-simple", "ta", "hi", "te", "ml"]),
});

export type LoanOfferInput = z.infer<typeof loanOfferSchema>;
export type LoanApplicationInput = z.infer<typeof loanApplicationSchema>;
export type LoanAnalysisInput = z.infer<typeof loanAnalysisSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
export type AISettingsInput = z.infer<typeof aiSettingsSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
