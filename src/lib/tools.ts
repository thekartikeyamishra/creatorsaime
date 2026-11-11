/**
 * Free public tools — pure functions (no network, no AI), so they are instant, private and
 * testable. Every estimate shows its assumptions; nothing pretends to be market data.
 */

// ───────────────────────────── Rate calculator ─────────────────────────────

export const RATE_FORMATS = {
  ig_reel: { label: "Instagram Reel", cpm: [200, 500] },
  ig_post: { label: "Instagram post / carousel", cpm: [120, 300] },
  ig_story: { label: "Instagram Story (per frame)", cpm: [60, 150] },
  yt_dedicated: { label: "YouTube dedicated video", cpm: [400, 900] },
  yt_integration: { label: "YouTube integration (60–90 s)", cpm: [250, 600] },
  yt_short: { label: "YouTube Short", cpm: [100, 250] },
} as const satisfies Record<string, { label: string; cpm: readonly [number, number] }>;
export type RateFormat = keyof typeof RATE_FORMATS;

export const NICHES = {
  finance: { label: "Finance & investing", m: 1.4 },
  tech: { label: "Tech & gadgets", m: 1.3 },
  education: { label: "Education & careers", m: 1.2 },
  beauty: { label: "Beauty & fashion", m: 1.15 },
  travel: { label: "Travel", m: 1.1 },
  food: { label: "Food & restaurants", m: 1.0 },
  fitness: { label: "Fitness & health", m: 1.05 },
  local: { label: "Local city / lifestyle", m: 1.0 },
  entertainment: { label: "Comedy & entertainment", m: 0.9 },
} as const;
export type Niche = keyof typeof NICHES;

export type RateInput = {
  format: RateFormat;
  avgViews: number;
  niche: Niche;
  /** Months the brand may run your content as a paid ad (0 = organic only). */
  usageMonths: number;
  exclusivity: boolean;
  /** Optional override of the ₹-per-1,000-views assumption. */
  cpmLow?: number;
  cpmHigh?: number;
};

export type RateResult = { low: number; mid: number; high: number; cpm: [number, number]; multiplier: number; breakdown: string[] };

const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step);

export function estimateRate(i: RateInput): RateResult {
  const views = Math.max(0, Math.min(Math.floor(i.avgViews || 0), 50_000_000));
  const base = RATE_FORMATS[i.format].cpm;
  const lo = i.cpmLow && i.cpmLow > 0 ? i.cpmLow : base[0];
  const hi = i.cpmHigh && i.cpmHigh >= lo ? i.cpmHigh : Math.max(lo, base[1]);
  const niche = NICHES[i.niche].m;
  const usage = 1 + 0.2 * Math.ceil(Math.max(0, Math.min(i.usageMonths, 24)) / 3);
  const excl = i.exclusivity ? 1.25 : 1;
  const multiplier = +(niche * usage * excl).toFixed(2);
  const k = views / 1000;
  const low = roundTo(k * lo * multiplier, 100);
  const high = Math.max(low, roundTo(k * hi * multiplier, 100));
  const mid = roundTo((low + high) / 2, 100);
  const breakdown = [
    `${views.toLocaleString("en-IN")} average views × ₹${lo}–₹${hi} per 1,000 views`,
    `Niche: ${NICHES[i.niche].label} × ${niche}`,
    i.usageMonths > 0 ? `Paid usage rights ${i.usageMonths} months × ${usage.toFixed(1)}` : "Organic post only (no paid usage rights)",
    i.exclusivity ? "Category exclusivity × 1.25" : "No exclusivity",
  ];
  return { low, mid, high, cpm: [lo, hi], multiplier, breakdown };
}

// ───────────────────────────── Engagement rate ─────────────────────────────

export type EngagementInput = { likes: number; comments: number; saves: number; shares: number; followers: number; views?: number };
export type EngagementResult = { byFollowers: number | null; byViews: number | null; interactions: number; band: "low" | "average" | "strong" | "exceptional" | null };

export function engagement(i: EngagementInput): EngagementResult {
  const n = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0);
  const interactions = n(i.likes) + n(i.comments) + n(i.saves) + n(i.shares);
  const byFollowers = n(i.followers) ? (interactions / n(i.followers)) * 100 : null;
  const byViews = i.views && n(i.views) ? (interactions / n(i.views)) * 100 : null;
  const ref = byViews ?? byFollowers;
  const band = ref === null ? null : ref < 1 ? "low" : ref < 3 ? "average" : ref < 6 ? "strong" : "exceptional";
  return { byFollowers: byFollowers === null ? null : +byFollowers.toFixed(2), byViews: byViews === null ? null : +byViews.toFixed(2), interactions, band };
}

// ───────────────────────────── GST invoice ─────────────────────────────

export type GstMode = "none" | "intra" | "inter" | "export";
export type InvoiceLine = { description: string; qty: number; rate: number };
export type InvoiceTotals = { subtotal: number; cgst: number; sgst: number; igst: number; total: number; tds: number; expectedCredit: number };

const r2 = (n: number) => Math.round(n * 100) / 100;

export function gstModeFor(registered: boolean, supplierState: string, clientState: string, clientAbroad: boolean): GstMode {
  if (!registered) return "none";
  if (clientAbroad) return "export";
  return supplierState && clientState && supplierState === clientState ? "intra" : "inter";
}

export function invoiceTotals(lines: InvoiceLine[], mode: GstMode, tdsPercent = 0): InvoiceTotals {
  const subtotal = r2(lines.reduce((s, l) => s + Math.max(0, l.qty || 0) * Math.max(0, l.rate || 0), 0));
  const cgst = mode === "intra" ? r2(subtotal * 0.09) : 0;
  const sgst = mode === "intra" ? r2(subtotal * 0.09) : 0;
  const igst = mode === "inter" ? r2(subtotal * 0.18) : 0;
  const total = r2(subtotal + cgst + sgst + igst);
  // TDS is deducted on the amount excluding GST when GST is shown separately.
  const tds = r2(subtotal * Math.max(0, Math.min(tdsPercent, 30)) / 100);
  return { subtotal, cgst, sgst, igst, total, tds, expectedCredit: r2(total - tds) };
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
function two(n: number): string {
  return n < 20 ? ONES[n]! : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`;
}
function three(n: number): string {
  const h = Math.floor(n / 100), r = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", r ? two(r) : ""].filter(Boolean).join(" ");
}

/** Indian numbering system: 1,23,45,678 → "One Crore Twenty Three Lakh …". */
export function rupeesInWords(amount: number): string {
  const a = Math.max(0, Math.round(amount * 100) / 100);
  let n = Math.floor(a);
  const paise = Math.round((a - n) * 100);
  if (n === 0 && paise === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7); n %= 1e7;
  const lakh = Math.floor(n / 1e5); n %= 1e5;
  const thousand = Math.floor(n / 1e3); n %= 1e3;
  if (crore) parts.push(`${crore < 100 ? two(crore) : three(crore % 1000)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (n) parts.push(three(n));
  const rupees = parts.length ? `${parts.join(" ")} Rupees` : "";
  const p = paise ? `${two(paise)} Paise` : "";
  return `${[rupees, p].filter(Boolean).join(" and ")} Only`;
}

// ───────────────────────────── Disclosure checker (ASCI) ─────────────────────────────

/** Labels permitted by ASCI's Guidelines for Influencer Advertising in Digital Media. */
export const ASCI_LABELS = ["advertisement", "ad", "sponsored", "collaboration", "partnership", "employee", "free gift"] as const;
const VAGUE = ["collab", "spon", "sp", "partner", "gifted", "gift", "aff", "affiliate", "thanks", "ambassador", "promo"];

export type DisclosureResult = {
  ok: boolean;
  found: string[];
  vague: string[];
  upfront: boolean;
  buriedInHashtags: boolean;
  tips: string[];
};

export function checkDisclosure(caption: string): DisclosureResult {
  const text = caption.normalize("NFKC");
  const lower = text.toLowerCase();
  const tokenRe = (w: string) => new RegExp(`(^|[^a-z0-9])#?${w.replace(" ", "[ _-]?")}(?![a-z0-9])`, "i");
  const found = ASCI_LABELS.filter((l) => tokenRe(l).test(lower));
  const vague = VAGUE.filter((v) => new RegExp(`#${v}(?![a-z0-9])`, "i").test(lower) && !found.some((f) => f.replace(" ", "") === v));
  const firstLines = lower.split(/\n/).slice(0, 2).join(" ").slice(0, 125);
  const upfront = found.some((l) => tokenRe(l).test(firstLines));
  const hashtags = lower.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  const idx = hashtags.findIndex((h) => found.some((l) => h === `#${l.replace(" ", "")}`));
  const buriedInHashtags = idx > 2;
  const tips: string[] = [];
  if (!found.length) tips.push("Add a clear label such as “Ad”, “Sponsored” or “Collaboration” — ASCI does not accept vague tags alone.");
  if (vague.length) tips.push(`Vague tags (${vague.map((v) => "#" + v).join(", ")}) don’t count as disclosure. Use a full permitted label.`);
  if (found.length && !upfront) tips.push("Move the label to the start: it must be visible without tapping “more”.");
  if (buriedInHashtags) tips.push("Don’t hide the label among other hashtags — put it first.");
  tips.push("Also switch on the platform’s own tool (Instagram “Paid partnership”, YouTube “Includes paid promotion”).");
  return { ok: found.length > 0 && upfront && !buriedInHashtags, found: [...found], vague, upfront, buriedInHashtags, tips };
}
