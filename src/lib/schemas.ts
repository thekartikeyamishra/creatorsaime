import { z } from "zod";
import {
  BRAND_INDUSTRIES,
  BRAND_OBJECTIVES,
  COMPENSATION_TYPES,
  DELIVERABLE_TYPES,
  LIMITS,
  PAYMENT_METHODS,
  CREATOR_CATEGORIES,
  LANGUAGES,
  PROFESSIONAL_SKILLS,
  REFERRAL_SOURCES,
  ROLES,
  SOCIAL_PLATFORMS,
} from "./config";

/** Strip control characters and collapse whitespace. All free text passes through this. */
export function cleanText(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/[ \t]+/g, " ").trim();
}

const text = (min: number, max: number) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().min(min, `Must be at least ${min} characters`).max(max, `Must be at most ${max} characters`));

const optionalText = (max: number) =>
  z
    .string()
    .transform(cleanText)
    .pipe(z.string().max(max, `Must be at most ${max} characters`))
    .optional()
    .default("");

/** http(s) URL only — rejects javascript:, data:, file: and friends. */
export const httpUrl = z
  .string()
  .transform((v) => {
    const t = v.trim();
    if (t && !/^https?:\/\//i.test(t)) return `https://${t}`;
    return t;
  })
  .pipe(
    z
      .string()
      .max(300, "URL is too long")
      .refine((v) => {
        try {
          const u = new URL(v);
          return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".") && !u.username && !u.password;
        } catch {
          return false;
        }
      }, "Enter a valid link starting with https://"),
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address").max(254));

export const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9A-HJKMNP-TV-Z]{8}$/, "Invalid referral code");

const allCategories = [...CREATOR_CATEGORIES, ...PROFESSIONAL_SKILLS, ...BRAND_INDUSTRIES] as const;

export const waitlistSchema = z
  .object({
    name: text(2, 80),
    email: emailSchema,
    city: text(2, 60),
    role: z.enum(ROLES),
    category: z.enum(allCategories),
    objective: z.enum(BRAND_OBJECTIVES).optional(),
    link: z.union([z.literal(""), httpUrl]).optional().default(""),
    languages: z.array(z.enum(LANGUAGES)).max(5).optional().default([]),
    challenges: optionalText(600),
    wants: optionalText(600),
    referralSource: z.enum(REFERRAL_SOURCES).optional(),
    ref: z.union([z.literal(""), referralCodeSchema]).optional().default(""),
    marketingConsent: z.boolean().default(false),
    termsAccepted: z.literal(true, "You must accept the Terms and Privacy Policy"),
    /** Honeypot. Real users never see or fill this. */
    company_fax: z.string().max(500).optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.role === "creator" && !(CREATOR_CATEGORIES as readonly string[]).includes(v.category)) {
      ctx.addIssue({ code: "custom", path: ["category"], message: "Choose a creator category" });
    }
    if (v.role === "professional" && !(PROFESSIONAL_SKILLS as readonly string[]).includes(v.category)) {
      ctx.addIssue({ code: "custom", path: ["category"], message: "Choose your primary skill" });
    }
    if (v.role === "brand") {
      if (!(BRAND_INDUSTRIES as readonly string[]).includes(v.category)) {
        ctx.addIssue({ code: "custom", path: ["category"], message: "Choose your industry" });
      }
      if (!v.objective) {
        ctx.addIssue({ code: "custom", path: ["objective"], message: "Choose your campaign objective" });
      }
    }
    if ((v.role === "creator" || v.role === "professional") && !v.link) {
      ctx.addIssue({ code: "custom", path: ["link"], message: "Add your public profile or portfolio link" });
    }
  });

export type WaitlistInput = z.input<typeof waitlistSchema>;
export type WaitlistData = z.output<typeof waitlistSchema>;

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/, "3–30 characters: lowercase letters, numbers and hyphens")
  .refine((h) => !h.includes("--"), "No consecutive hyphens")
  .refine((h) => !RESERVED_HANDLES.has(h), "This handle is reserved");

export const RESERVED_HANDLES = new Set([
  "admin", "api", "app", "about", "brands", "creators", "dashboard", "help", "join", "login", "signup",
  "support", "privacy", "terms", "creatorsai", "official", "team", "staff", "security", "root", "system",
]);

export const creatorProfileSchema = z.object({
  displayName: text(2, 80),
  handle: handleSchema,
  bio: optionalText(500),
  city: text(2, 60),
  categories: z.array(z.enum([...CREATOR_CATEGORIES, ...PROFESSIONAL_SKILLS])).min(1, "Pick at least one").max(4),
  languages: z.array(z.enum(LANGUAGES)).max(6).default([]),
  portfolioLinks: z.array(httpUrl).max(6).default([]),
  rateCardNote: optionalText(300),
  openToPods: z.boolean().default(true),
  isPublic: z.boolean().default(false),
});
export type CreatorProfileInput = z.input<typeof creatorProfileSchema>;

export const brandProfileSchema = z.object({
  displayName: text(2, 80),
  handle: handleSchema,
  bio: optionalText(500),
  city: text(2, 60),
  industry: z.enum(BRAND_INDUSTRIES),
  website: z.union([z.literal(""), httpUrl]).default(""),
  isPublic: z.boolean().default(false),
});
export type BrandProfileInput = z.input<typeof brandProfileSchema>;

export const socialSubmissionSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  url: httpUrl,
  handle: text(1, 60),
  followerCountSelfReported: z.number().int().min(0).max(1_000_000_000).optional(),
});

export const brandVerificationSchema = z.object({
  legalName: text(2, 120),
  representativeName: text(2, 80),
  representativeRole: text(2, 60),
  businessEmail: emailSchema,
  businessPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s-]{7,16}$/, "Enter a valid phone number"),
  website: z.union([z.literal(""), httpUrl]).default(""),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), "Invalid GSTIN format")
    .default(""),
  registeredAddress: text(10, 300),
});

/** Open sign-up: free account (Deal Desk, tools, profile). Network trust still comes from verifications. */
export const registerSchema = z.object({
  role: z.enum(ROLES),
  name: z.string().trim().min(2, "Enter your name").max(80),
  city: z.string().trim().max(60).optional().default(""),
  category: z.string().trim().max(60).optional(),
  marketingConsent: z.boolean().optional().default(false),
  termsAccepted: z.literal(true, "You must accept the Terms and Privacy Policy"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const redeemInviteSchema = z.object({
  code: z.string().trim().min(20).max(80).regex(/^[A-Za-z0-9_-]+$/, "Invalid invite code"),
});

export const adminWaitlistActionSchema = z.object({
  action: z.enum(["approve", "reject", "revoke_invite"]),
  note: optionalText(300),
});

export const adminVerificationActionSchema = z.object({
  kind: z.enum(["social", "brand"]),
  action: z.enum(["verify", "reject"]),
  note: optionalText(300),
});

export const adminUserActionSchema = z.object({
  action: z.enum(["suspend", "reactivate"]),
  reason: text(5, 300),
});

export const dataRequestSchema = z.object({
  type: z.enum(["deletion", "correction", "grievance"]),
  details: optionalText(1000),
});

// ─── Stage 2: Deal Desk, campaigns, billing ───────────────────

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Use a valid date");

const amount = z.number().int("Whole rupees only").min(0).max(LIMITS.maxAmountInr, "Amount is too large");

/** Indian/international phone → digits only; empty allowed. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .pipe(z.string().refine((v) => v === "" || /^\+?[0-9]{10,15}$/.test(v), "Enter a valid phone number"));

export const upiIdSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/.test(v), "Enter a valid UPI ID, e.g. name@okbank");

export const deliverableInput = z.object({
  type: z.enum(DELIVERABLE_TYPES),
  qty: z.number().int().min(1).max(50),
  dueDate: z.union([z.literal(""), isoDate]).default(""),
  note: optionalText(200),
});

export const counterpartySchema = z.object({
  name: text(2, 100),
  phone: phoneSchema.default(""),
  email: z.union([z.literal(""), emailSchema]).default(""),
});

/** Terms both parties agree to. Changing any of these after acceptance resets acceptance. */
export const dealTermsSchema = z.object({
  title: text(3, 120),
  deliverables: z.array(deliverableInput).min(1, "Add at least one deliverable").max(LIMITS.deliverablesPerDeal),
  compensationType: z.enum(COMPENSATION_TYPES),
  feeAmount: amount,
  paymentTerms: optionalText(300),
  paymentDueDate: z.union([z.literal(""), isoDate]).default(""),
  usageRights: optionalText(300),
  revisionLimit: z.number().int().min(0).max(10).default(2),
});
export type DealTerms = z.output<typeof dealTermsSchema>;

export const dealCreateSchema = z.object({
  terms: dealTermsSchema,
  counterparty: counterpartySchema,
  status: z.enum(["active", "completed"]).default("active"),
});

const proofUrl = z.union([z.literal(""), httpUrl]).default("");

export const dealActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update_terms"), terms: dealTermsSchema }),
  z.object({ action: z.literal("update_counterparty"), counterparty: counterpartySchema }),
  z.object({ action: z.literal("accept_terms") }),
  z.object({
    action: z.literal("deliverable_status"),
    deliverableId: z.string().regex(/^[A-Za-z0-9]{6,24}$/),
    status: z.enum(["pending", "submitted", "approved"]),
    proofUrl,
  }),
  z.object({
    action: z.literal("add_payment"),
    amount: amount.min(1, "Enter an amount"),
    date: isoDate,
    method: z.enum(PAYMENT_METHODS),
    note: optionalText(200),
  }),
  z.object({ action: z.literal("remove_payment"), paymentId: z.string().regex(/^[A-Za-z0-9]{6,24}$/) }),
  z.object({ action: z.literal("set_tracking"), destinationUrl: z.union([z.literal(""), httpUrl]), promoCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{0,20}$/, "Letters, numbers and hyphens only") }),
  z.object({ action: z.literal("redemption"), delta: z.union([z.literal(1), z.literal(-1)]) }),
  z.object({ action: z.literal("confirm_complete") }),
  z.object({ action: z.literal("cancel"), reason: text(3, 300) }),
  z.object({ action: z.literal("share_link") }),
  z.object({ action: z.literal("auto_reminders"), enabled: z.boolean() }),
]);
export type DealAction = z.output<typeof dealActionSchema>;

export const publicDealActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept_terms"), name: text(2, 100) }),
  z.object({ action: z.literal("confirm_complete"), name: text(2, 100) }),
  z.object({ action: z.literal("whatsapp_optin"), name: text(2, 100), phone: phoneSchema.pipe(z.string().min(10, "Enter your WhatsApp number")), lang: z.enum(["en", "hi"]).default("en") }),
  z.object({ action: z.literal("whatsapp_optout") }),
]);

export const campaignSchema = z
  .object({
    title: text(5, 120),
    description: text(30, 2000),
    city: text(2, 60),
    categories: z.array(z.enum(CREATOR_CATEGORIES)).min(1, "Pick at least one").max(4),
    deliverables: z.array(deliverableInput).min(1).max(10),
    compensationType: z.enum(COMPENSATION_TYPES),
    budgetMin: amount,
    budgetMax: amount,
    creatorsNeeded: z.number().int().min(1).max(50),
    applyBy: isoDate,
    usageRights: optionalText(300),
    status: z.enum(["draft", "open"]).default("draft"),
  })
  .refine((v) => v.budgetMax >= v.budgetMin, { path: ["budgetMax"], message: "Max must be at least the min" })
  .refine((v) => v.compensationType === "barter" || v.budgetMax > 0, { path: ["budgetMax"], message: "Add a budget for paid campaigns" });
export type CampaignInput = z.input<typeof campaignSchema>;

export const campaignActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), campaign: campaignSchema }),
  z.object({ action: z.literal("open") }),
  z.object({ action: z.literal("close") }),
]);

export const applicationSchema = z.object({
  pitch: text(20, 1000),
  proposedFee: amount,
  availableBy: z.union([z.literal(""), isoDate]).default(""),
});

export const applicationActionSchema = z.object({
  action: z.enum(["shortlist", "accept", "decline", "withdraw"]),
  note: optionalText(300),
});

export const billingSchema = z.object({
  legalName: text(2, 120),
  address: optionalText(300),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), "Invalid GSTIN format")
    .default(""),
  upiId: upiIdSchema.default(""),
  invoicePrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,6}$/, "1–6 letters/numbers").default("INV"),
});

// ─── v0.5: Creator Pods ───────────────────────────────────────
export const podDetailsSchema = z.object({
  name: text(3, 60),
  city: text(2, 60),
  description: optionalText(500),
  categories: z.array(z.enum([...CREATOR_CATEGORIES, ...PROFESSIONAL_SKILLS])).min(1, "Pick at least one").max(4),
  isPublic: z.boolean().default(true),
});

const podRole = text(2, 40);
const share = z.number().int("Whole percentages only").min(1).max(100);

export const podActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), details: podDetailsSchema }),
  z.object({ action: z.literal("invite"), handle: handleSchema, role: podRole, sharePct: share }),
  z.object({
    action: z.literal("set_members"),
    members: z.array(z.object({ uid: z.string().regex(/^[A-Za-z0-9]{1,128}$/), role: podRole, sharePct: share })).min(1).max(8),
  }),
  z.object({ action: z.literal("remove"), uid: z.string().regex(/^[A-Za-z0-9]{1,128}$/) }),
  z.object({ action: z.literal("accept_invite") }),
  z.object({ action: z.literal("decline_invite") }),
  z.object({ action: z.literal("leave") }),
  z.object({ action: z.literal("archive") }),
]);

export const podApplicationSchema = applicationSchema.extend({ podId: z.string().regex(/^[A-Za-z0-9]{1,128}$/) });

export const podDealActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assign_deliverable"), deliverableId: z.string().regex(/^[A-Za-z0-9]{6,24}$/), assigneeUid: z.union([z.literal(""), z.string().regex(/^[A-Za-z0-9]{1,128}$/)]) }),
  z.object({
    action: z.literal("record_payout"),
    toUid: z.string().regex(/^[A-Za-z0-9]{1,128}$/),
    amount: amount.min(1, "Enter an amount"),
    date: isoDate,
    method: z.enum(PAYMENT_METHODS),
    note: optionalText(200),
  }),
  z.object({ action: z.literal("confirm_payout"), payoutId: z.string().regex(/^[A-Za-z0-9]{6,24}$/) }),
]);


// ── v0.13 reviews ──
export const reviewSchema = z.object({
  rating: z.number().int().min(1, "Choose a rating").max(5),
  tags: z.array(z.string().max(40)).max(3).optional().default([]),
  text: z.string().max(400).optional().default(""),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
export const linkReviewSchema = reviewSchema.extend({ name: z.string().trim().min(2, "Enter your name").max(80) });
