/**
 * Single source of truth for product configuration.
 * Edit here — never scatter city lists or category names across components.
 */

export const site = {
  name: "CreatorsAI",
  tagline: "Create together. Grow together.",
  description:
    "CreatorsAI is an invite-only network where verified creators find paid brand collaborations, brands find reliable local talent, and creator communities build opportunities together.",
  founder: "Kartikeya Mishra",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://creatorsai.me").replace(/\/+$/, ""),
  xHandle: "KartikeyahereX",
  xUrl: "https://x.com/KartikeyahereX",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@example.com",
  grievanceEmail: process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL || "grievance@example.com",
  locale: "en_IN",
} as const;

/** Version stamp recorded with every consent record. Bump when the privacy policy changes materially. */
export const POLICY_VERSION = "2026-11-12";

/** Data schema version written on every document we create. */
export const SCHEMA_VERSION = 1;

/**
 * First-cohort cities. These are where curated onboarding happens first.
 * They are NOT presented as active chapters until real activity exists.
 */
export const COHORT_CITIES = ["Hyderabad", "Prayagraj"] as const;

export const ROLES = ["creator", "brand", "professional"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  creator: "Creator",
  brand: "Brand / Business",
  professional: "Creative Professional",
};

export const CREATOR_CATEGORIES = [
  "Food & Restaurants",
  "Fashion & Beauty",
  "Lifestyle",
  "Fitness & Health",
  "Travel",
  "Technology",
  "Education",
  "Comedy & Entertainment",
  "Music & Dance",
  "Finance",
  "Parenting & Family",
  "Local Community & City",
  "Gaming",
  "Art & Design",
  "Other",
] as const;

export const PROFESSIONAL_SKILLS = [
  "Photography",
  "Videography",
  "Video Editing",
  "Graphic Design",
  "Scriptwriting",
  "Event Organising",
  "Social Media Management",
  "Other",
] as const;

export const BRAND_OBJECTIVES = [
  "Store footfall / visits",
  "Product launch",
  "Brand awareness",
  "Event promotion",
  "App installs / sign-ups",
  "Online sales",
  "Content for our own channels",
] as const;
export type BrandObjective = (typeof BRAND_OBJECTIVES)[number];

export const SOCIAL_PLATFORMS = ["instagram", "youtube", "linkedin", "x", "facebook", "moj", "josh", "other"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  facebook: "Facebook",
  moj: "Moj",
  josh: "Josh",
  other: "Other",
};

export const LANGUAGES = [
  "Hindi",
  "English",
  "Telugu",
  "Urdu",
  "Bhojpuri",
  "Marathi",
  "Tamil",
  "Kannada",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Malayalam",
  "Other",
] as const;

export const REFERRAL_SOURCES = [
  "Instagram",
  "YouTube",
  "LinkedIn",
  "WhatsApp",
  "A friend or creator",
  "An event",
  "Search engine",
  "Other",
] as const;

export const BRAND_INDUSTRIES = [
  "Restaurant / Café",
  "Fashion & Apparel",
  "Beauty & Salon",
  "Fitness & Gym",
  "Hospitality & Travel",
  "D2C / E-commerce",
  "Education & Coaching",
  "Events & Entertainment",
  "Technology / App",
  "Real Estate",
  "Other",
] as const;
export type BrandIndustry = (typeof BRAND_INDUSTRIES)[number];

// ─── Stage 2: Deal Desk & campaigns ───────────────────────────
export const DELIVERABLE_TYPES = [
  "Instagram Reel",
  "Instagram Post",
  "Instagram Story",
  "YouTube Video",
  "YouTube Short",
  "Store / Event Visit",
  "Photo Shoot",
  "Video Shoot",
  "Edited Video",
  "Blog / Review",
  "Other",
] as const;

export const COMPENSATION_TYPES = ["paid", "barter", "paid_plus_product"] as const;
export const COMPENSATION_LABELS: Record<(typeof COMPENSATION_TYPES)[number], string> = {
  paid: "Paid",
  barter: "Product / service only",
  paid_plus_product: "Paid + product",
};

export const PAYMENT_METHODS = ["UPI", "Bank transfer", "Cash", "Cheque", "Other"] as const;

export const LIMITS = {
  deliverablesPerDeal: 20,
  paymentsPerDeal: 50,
  openCampaignsPerBrand: 10,
  activeDealsPerUser: 300,
  maxAmountInr: 10_000_000,
} as const;
