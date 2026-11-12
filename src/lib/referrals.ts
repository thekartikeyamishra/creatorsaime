/**
 * Member referrals — rules shared by server, client and tests.
 *
 * Economics: rewards are paid in platform value (Growth days, Ambassador status), never cash,
 * and only after the referred person does something real and verified (a paid purchase or a
 * deal both sides confirmed). Cost to CreatorsAI ≈ ₹0; fake sign-ups earn nothing.
 */
import type { Role } from "./config";

export const REFERRAL = {
  /** Free Growth days a brand gets when it joins through someone's link (once per account). */
  brandTrialDays: 14,
  /** Growth days a brand referrer earns per qualified referral. */
  rewardDays: { brand_first_payment: 30, creator_first_verified_deal: 15 } as const,
  /** Rewards per referrer per calendar year. Extra qualified referrals still count toward Ambassador level. */
  maxRewardsPerYear: 12,
  /** How long a link click is remembered before sign-up. */
  attributionDays: 30,
  cookie: "cai_ref",
} as const;

export type QualifyEvent = keyof typeof REFERRAL.rewardDays;
export type ReferralStatus = "joined" | "qualified";

export const REF_CODE_RE = /^[a-z0-9]{8}$/;

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no 0/o/1/l/i — easy to read aloud

export function newRefCode(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return s;
}

export function qualifyEventFor(referredRole: Role): QualifyEvent {
  return referredRole === "brand" ? "brand_first_payment" : "creator_first_verified_deal";
}

export type Ambassador = { level: 0 | 1 | 2 | 3; title: string | null; next: number | null };

/** Ambassador level from qualified referrals: 1 → Ambassador, 3 → Community Builder, 10 → Founding Ambassador. */
export function ambassadorLevel(qualified: number): Ambassador {
  if (qualified >= 10) return { level: 3, title: "Founding Ambassador", next: null };
  if (qualified >= 3) return { level: 2, title: "Community Builder", next: 10 };
  if (qualified >= 1) return { level: 1, title: "Ambassador", next: 3 };
  return { level: 0, title: null, next: 1 };
}

export type RewardDecision = { rewarded: boolean; growthDays: number; reason: "ok" | "yearly_cap" | "not_brand_referrer" };

/**
 * What the referrer gets for one qualified referral. Brands receive Growth days; creators and
 * professionals (always free) progress Ambassador status. Capped per calendar year.
 */
export function decideReward(referrerRole: Role, event: QualifyEvent, rewardsThisYear: number): RewardDecision {
  if (rewardsThisYear >= REFERRAL.maxRewardsPerYear) return { rewarded: false, growthDays: 0, reason: "yearly_cap" };
  if (referrerRole !== "brand") return { rewarded: true, growthDays: 0, reason: "not_brand_referrer" };
  return { rewarded: true, growthDays: REFERRAL.rewardDays[event], reason: "ok" };
}

export function shareText(name: string, link: string, role: Role): string {
  return role === "brand"
    ? `We use CreatorsAI to find verified creators and track every collaboration. Join with my link — brands get ${REFERRAL.brandTrialDays} days of Growth free: ${link}`
    : `I track my brand deals and get paid on time with CreatorsAI — free for creators. Join with my link: ${link}`;
}
