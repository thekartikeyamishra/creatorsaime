/** Registry of free public tools — drives the hub, header/footer links, sitemap and schema. */
export type ToolMeta = {
  slug: string;
  name: string;
  /** Short line for cards. */
  blurb: string;
  /** Meta description (≤ 160 chars). */
  description: string;
  audience: "creators" | "brands" | "both";
  emoji: string;
  updated: string;
};

export const TOOLS: ToolMeta[] = [
  {
    slug: "rate-calculator",
    name: "Creator Rate Calculator (India)",
    blurb: "What to charge for a Reel, Story or YouTube video — with every assumption shown.",
    description: "Free influencer rate calculator for India. Estimate a fair fee for Instagram Reels, Stories and YouTube from your real views, niche and usage rights.",
    audience: "both",
    emoji: "₹",
    updated: "2026-11-11",
  },
  {
    slug: "gst-invoice-generator",
    name: "GST Invoice Generator for Creators",
    blurb: "A clean, numbered invoice with CGST/SGST or IGST, TDS and UPI — print or save as PDF.",
    description: "Free GST invoice maker for Indian creators and freelancers. CGST/SGST or IGST, export (LUT), TDS-aware net amount, amount in words. No sign-up.",
    audience: "creators",
    emoji: "🧾",
    updated: "2026-11-11",
  },
  {
    slug: "collab-agreement-generator",
    name: "Brand Collaboration Agreement Generator",
    blurb: "Plain-language agreement: deliverables, revisions, usage rights, payment dates and ad disclosure.",
    description: "Generate a plain-English influencer–brand collaboration agreement for India: deliverables, usage rights, payment terms, ASCI disclosure and kill fee.",
    audience: "both",
    emoji: "🤝",
    updated: "2026-11-11",
  },
  {
    slug: "ad-disclosure-checker",
    name: "Ad Disclosure Checker (ASCI)",
    blurb: "Paste a caption — see if your #ad label meets ASCI's influencer rules before you post.",
    description: "Check if your Instagram or YouTube caption meets ASCI influencer ad-disclosure guidelines in India. Instant, private, free.",
    audience: "both",
    emoji: "✅",
    updated: "2026-11-11",
  },
  {
    slug: "engagement-rate-calculator",
    name: "Engagement Rate Calculator",
    blurb: "Engagement by followers and by views, explained — the number brands actually look at.",
    description: "Free Instagram and YouTube engagement rate calculator — by followers and by views, with what the numbers mean for brand deals.",
    audience: "both",
    emoji: "📈",
    updated: "2026-11-11",
  },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);
