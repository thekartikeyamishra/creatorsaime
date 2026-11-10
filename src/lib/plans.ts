/**
 * Pricing & entitlements — single source of truth (shared by server, client and tests).
 * Prices are in paise. Creators are always free; revenue comes from brands that get value.
 */
export type Tier = "free" | "growth";
export type ProductId = "growth_monthly" | "growth_yearly" | "managed_pilot";

export type Product = {
  id: ProductId;
  name: string;
  amountPaise: number;
  kind: "plan" | "service";
  days?: number;
  blurb: string;
};

export const PRODUCTS: Record<ProductId, Product> = {
  growth_monthly: { id: "growth_monthly", name: "Growth — 1 month", amountPaise: 149_900, kind: "plan", days: 30, blurb: "Billed once. No auto-renewal." },
  growth_yearly: { id: "growth_yearly", name: "Growth — 12 months", amountPaise: 1_499_000, kind: "plan", days: 365, blurb: "2 months free vs monthly. No auto-renewal." },
  managed_pilot: { id: "managed_pilot", name: "Managed Pilot Campaign", amountPaise: 499_900, kind: "service", blurb: "We source, coordinate and report one campaign for you. Creator fees are separate." },
};

export const LIMITS_BY_TIER: Record<Tier, { openCampaigns: number; featuredBriefs: boolean; resultsExport: boolean; prioritySupport: boolean; fullRateIndex: boolean }> = {
  free: { openCampaigns: 1, featuredBriefs: false, resultsExport: false, prioritySupport: false, fullRateIndex: false },
  growth: { openCampaigns: 10, featuredBriefs: true, resultsExport: true, prioritySupport: true, fullRateIndex: true },
};

export function formatPaise(p: number): string {
  const r = p / 100;
  return `₹${r.toLocaleString("en-IN", { minimumFractionDigits: r % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** Active tier given a stored expiry (ISO string or ms). */
export function tierAt(expiresAtMs: number | null | undefined, nowMs: number = Date.now()): Tier {
  return expiresAtMs && expiresAtMs > nowMs ? "growth" : "free";
}

/** New expiry after buying `days`: stacks on top of remaining time, never loses paid days. */
export function extendExpiry(currentMs: number | null | undefined, days: number, nowMs: number = Date.now()): number {
  const base = currentMs && currentMs > nowMs ? currentMs : nowMs;
  return base + days * 86_400_000;
}

export function daysLeft(expiresAtMs: number | null | undefined, nowMs: number = Date.now()): number {
  if (!expiresAtMs || expiresAtMs <= nowMs) return 0;
  return Math.ceil((expiresAtMs - nowMs) / 86_400_000);
}
