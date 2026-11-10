import {
  COHORT_CITIES,
  CREATOR_CATEGORIES,
  type BrandIndustry,
  type BrandObjective,
  type SocialPlatform,
} from "./config";
import type { WaitlistData } from "./schemas";

/**
 * Deterministic "aha moment" previews.
 *
 * Rules (from the product strategy):
 *  - No fake AI scores, no invented opportunities, no fabricated counts.
 *  - If nothing is live yet, say so plainly and show a useful next step.
 *  - Pure function: no network, no AI provider — works even if every provider is down.
 */

export type PodMember = { role: string; why: string };

export type CreatorPreview = {
  kind: "creator" | "professional";
  headline: string;
  platform: SocialPlatform | null;
  inCohortCity: boolean;
  strengths: string[];
  nextSteps: string[];
  honestStatus: string;
};

export type BrandPreview = {
  kind: "brand";
  headline: string;
  inCohortCity: boolean;
  suggestedPod: PodMember[];
  whatYouGet: string[];
  nextSteps: string[];
  honestStatus: string;
};

export type Preview = CreatorPreview | BrandPreview;

export function detectPlatform(link: string): SocialPlatform | null {
  if (!link) return null;
  let host: string;
  try {
    host = new URL(link).hostname.toLowerCase().replace(/^www\.|^m\./, "");
  } catch {
    return null;
  }
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) return "youtube";
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
  if (host === "x.com" || host === "twitter.com") return "x";
  if (host === "facebook.com" || host === "fb.com" || host.endsWith(".facebook.com")) return "facebook";
  if (host.includes("mojapp") || host === "moj.app") return "moj";
  if (host.includes("myjosh") || host === "josh.app") return "josh";
  return "other";
}

export function isCohortCity(city: string): boolean {
  const c = city.trim().toLowerCase();
  const aliases: Record<string, string> = { allahabad: "prayagraj", secunderabad: "hyderabad", cyberabad: "hyderabad" };
  const normalized = aliases[c] ?? c;
  return COHORT_CITIES.some((x) => x.toLowerCase() === normalized);
}

const INDUSTRY_TO_CREATOR: Record<BrandIndustry, (typeof CREATOR_CATEGORIES)[number]> = {
  "Restaurant / Café": "Food & Restaurants",
  "Fashion & Apparel": "Fashion & Beauty",
  "Beauty & Salon": "Fashion & Beauty",
  "Fitness & Gym": "Fitness & Health",
  "Hospitality & Travel": "Travel",
  "D2C / E-commerce": "Lifestyle",
  "Education & Coaching": "Education",
  "Events & Entertainment": "Comedy & Entertainment",
  "Technology / App": "Technology",
  "Real Estate": "Local Community & City",
  Other: "Lifestyle",
};

export function suggestPod(industry: BrandIndustry, objective: BrandObjective): PodMember[] {
  const primary = INDUSTRY_TO_CREATOR[industry];
  const pod: PodMember[] = [{ role: `${primary} creator`, why: "Speaks directly to your core audience" }];

  switch (objective) {
    case "Store footfall / visits":
      pod.push(
        { role: "Local Community & City creator", why: "Reach people who live close enough to visit" },
        { role: "Photographer", why: "Ready-to-use visuals for your listings and menus" },
      );
      break;
    case "Product launch":
      pod.push(
        { role: "Lifestyle creator", why: "Shows the product in everyday use" },
        { role: "Videographer", why: "One polished launch film you can reuse" },
      );
      break;
    case "Brand awareness":
      pod.push(
        { role: "Lifestyle creator", why: "Broad, relatable reach" },
        { role: "Local Community & City creator", why: "Trusted local voice" },
      );
      break;
    case "Event promotion":
      pod.push(
        { role: "Comedy & Entertainment creator", why: "Shareable pre-event buzz" },
        { role: "Videographer", why: "Event recap content for next time" },
      );
      break;
    case "App installs / sign-ups":
      pod.push(
        { role: "Technology creator", why: "Explains the app clearly" },
        { role: "Video Editing professional", why: "Short tutorial cut-downs" },
      );
      break;
    case "Online sales":
      pod.push(
        { role: "Lifestyle creator", why: "Authentic product reviews" },
        { role: "Photographer", why: "Product shots for your store" },
      );
      break;
    case "Content for our own channels":
      pod.push(
        { role: "Videographer", why: "Owned brand video content" },
        { role: "Photographer", why: "A reusable image library" },
      );
      break;
  }

  // De-duplicate if the primary already matches a suggested role.
  const seen = new Set<string>();
  return pod.filter((m) => (seen.has(m.role) ? false : (seen.add(m.role), true)));
}

export function buildPreview(input: WaitlistData): Preview {
  const inCohortCity = isCohortCity(input.city);

  if (input.role === "brand") {
    const industry = input.category as BrandIndustry;
    const objective = (input.objective ?? "Brand awareness") as BrandObjective;
    return {
      kind: "brand",
      headline: `Your Campaign Match Preview: ${objective.toLowerCase()} in ${input.city}`,
      inCohortCity,
      suggestedPod: suggestPod(industry, objective),
      whatYouGet: [
        "A curated shortlist of verified creators — reviewed by a person, not just an algorithm",
        "Clear deliverables, usage rights and revision limits agreed upfront",
        "One coordinated campaign instead of chasing creators one by one",
      ],
      nextSteps: [
        "We review every brand request personally during early access",
        "You'll receive an invite to create your brand profile and first campaign brief",
      ],
      honestStatus: inCohortCity
        ? `${input.city} is one of our first cohort cities. We're curating verified creators now — your shortlist will only include real, available people.`
        : `We're onboarding our first cohort in ${COHORT_CITIES.join(" and ")} first. We'll tell you honestly when we can serve ${input.city}.`,
    };
  }

  const platform = detectPlatform(input.link);
  const strengths: string[] = [];
  if (input.category) strengths.push(`Clear focus: ${input.category}`);
  if (input.languages.length > 0) strengths.push(`Reaches audiences in ${input.languages.join(", ")}`);
  if (inCohortCity) strengths.push(`Based in ${input.city}, a first-cohort city`);
  else strengths.push(`Local voice in ${input.city}`);
  if (platform && platform !== "other") strengths.push("Public profile ready for ownership verification");

  const nextSteps = [
    "Verify you own your social account (takes about 2 minutes once invited)",
    "Build your Creator Trust Passport — a shareable, verified portfolio",
  ];
  if (input.role === "creator") nextSteps.push("Opt in to Creator Pods to access larger team campaigns");
  else nextSteps.push("Join Creator Pods as the photo/video/editing specialist brands need");

  return {
    kind: input.role,
    headline: input.role === "creator" ? "Your Creator Opportunity Preview" : "Your Creative Professional Preview",
    platform,
    inCohortCity,
    strengths,
    nextSteps,
    honestStatus:
      "There are no live campaigns on CreatorsAI yet — we're building a verified first cohort before inviting brands in. When opportunities that fit your profile go live, you'll be among the first to know.",
  };
}
