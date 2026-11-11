/**
 * Google AdSense configuration.
 *
 * Policy-first design:
 *  - Ads appear ONLY on public, content-rich pages (free tools and guides) — never on the app,
 *    sign-in, checkout, pricing, invite forms, deal links, profiles or legal pages. Google does not
 *    allow ads on screens without publisher content, behind logins, or next to navigation/buttons
 *    in a way that causes accidental clicks.
 *  - At most MAX_ADS_PER_PAGE manual units, always below meaningful content, labelled "Advertisement",
 *    with reserved space so they never shift the layout (CLS).
 *  - One switch turns everything off: NEXT_PUBLIC_ADS_ENABLED=false.
 */

export const ADSENSE_CLIENT = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-4557897331416844").trim();

/** Publisher ID in ads.txt form (pub-…). */
export const ADSENSE_PUB_ID = ADSENSE_CLIENT.replace(/^ca-/, "");

export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED !== "false" && /^ca-pub-\d{10,20}$/.test(ADSENSE_CLIENT);

/** Ad unit IDs created in AdSense → Ads → By ad unit. A placement renders nothing until its slot ID is set. */
export const AD_SLOTS = {
  /** Responsive display unit shown after a tool's result. */
  tool: process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOOL || "",
  /** In-article unit placed between guide sections. */
  article: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE || "",
  /** Multiplex ("related content") unit at the end of guides and hub pages. */
  multiplex: process.env.NEXT_PUBLIC_ADSENSE_SLOT_MULTIPLEX || "",
} as const;

export type AdPlacement = keyof typeof AD_SLOTS;

export const MAX_ADS_PER_PAGE = 3;

const ELIGIBLE = [/^\/tools(\/[a-z0-9-]+)?\/?$/, /^\/guides(\/[a-z0-9-]+)?\/?$/];

/** True only for public content pages where ads are allowed by our policy. */
export function isAdEligiblePath(pathname: string): boolean {
  const p = pathname.split(/[?#]/)[0] ?? "";
  return ELIGIBLE.some((re) => re.test(p));
}

export function adsTxtLine(pubId = ADSENSE_PUB_ID): string {
  return `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`;
}
