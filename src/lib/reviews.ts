/**
 * Verified reviews — rules shared by server, client and tests.
 *
 * A review can only exist for a deal BOTH sides confirmed as complete, one per side per deal.
 * Double-blind: hidden until the other side reviews too, or 14 days pass — so nobody reviews in
 * retaliation. That makes every review evidence-backed and impossible to buy or fake in bulk.
 */
export const REVIEW_REVEAL_DAYS = 14;
export const REVIEW_TEXT_MAX = 280;

/** Tags describe the person being reviewed. */
export const REVIEW_TAGS = {
  creator: ["Delivered on time", "Great content", "Followed the brief", "Easy to work with", "Drove results"],
  brand: ["Paid on time", "Clear brief", "Fair feedback", "Respectful", "Would work again"],
} as const;

export type ReviewSubject = keyof typeof REVIEW_TAGS;

export type PublicReview = {
  id: string;
  rating: number;
  tags: string[];
  text: string;
  reviewerName: string;
  via: "account" | "link";
  dealTitle: string;
  createdAt: string;
};

const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|in|me|net|org|io|co|app|xyz)\b)/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /(\+?\d[\d\s-]{8,}\d)/;

/** Cleans review text. Rejects links, emails and phone numbers (spam / off-platform poaching). */
export function cleanReviewText(input: string | undefined): { ok: true; text: string } | { ok: false; error: string } {
  const text = (input ?? "").replace(/\s+/g, " ").trim().slice(0, REVIEW_TEXT_MAX);
  if (URL_RE.test(text)) return { ok: false, error: "Please don't include links in reviews." };
  if (EMAIL_RE.test(text) || PHONE_RE.test(text)) return { ok: false, error: "Please don't include contact details in reviews." };
  return { ok: true, text };
}

export function validTags(subject: ReviewSubject, tags: string[]): string[] {
  const allowed = new Set<string>(REVIEW_TAGS[subject]);
  return [...new Set(tags)].filter((t) => allowed.has(t)).slice(0, 3);
}

export function revealAtMs(createdMs: number, counterpartAlreadyReviewed: boolean): number {
  return counterpartAlreadyReviewed ? createdMs : createdMs + REVIEW_REVEAL_DAYS * 86_400_000;
}

export type ReviewSummary = { count: number; average: number | null; topTags: Array<{ tag: string; count: number }> };

export function summarize(reviews: Array<Pick<PublicReview, "rating" | "tags">>): ReviewSummary {
  if (!reviews.length) return { count: 0, average: null, topTags: [] };
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  const counts = new Map<string, number>();
  for (const r of reviews) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  const topTags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4).map(([tag, count]) => ({ tag, count }));
  return { count: reviews.length, average: Math.round((sum / reviews.length) * 10) / 10, topTags };
}
