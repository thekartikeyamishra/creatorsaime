import "server-only";
import { FieldValue, Timestamp, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { SCHEMA_VERSION } from "@/lib/config";
import type { Side } from "@/lib/deals";
import { cleanReviewText, revealAtMs, validTags, type ReviewSubject } from "@/lib/reviews";
import type { ReviewInput } from "@/lib/schemas";
import { auditIn } from "./audit";
import { C } from "./collections";
import type { DealDoc } from "./deals";
import { ApiError } from "./http";
import { notifyIn } from "./notify";

export const reviewId = (dealId: string, reviewerSide: Side) => `${dealId}_${reviewerSide}`;
const other = (s: Side): Side => (s === "creator" ? "brand" : "creator");

export type ReviewState = {
  canReview: boolean;
  reason: "ok" | "not_verified" | "already_reviewed" | "subject_not_member";
  mine: { rating: number; tags: string[]; text: string } | null;
  subject: ReviewSubject;
  subjectName: string;
};

export function reviewStateFor(deal: DealDoc, side: Side, mine: FirebaseFirestore.DocumentSnapshot | null): ReviewState {
  const subjectSide = other(side);
  const subjectParty = subjectSide === "creator" ? deal.creatorSide : deal.brandSide;
  const base = { subject: subjectSide as ReviewSubject, subjectName: subjectParty.name };
  if (mine?.exists) return { ...base, canReview: false, reason: "already_reviewed", mine: { rating: mine.get("rating"), tags: mine.get("tags") ?? [], text: mine.get("text") ?? "" } };
  if (!deal.verifiedCompletion) return { ...base, canReview: false, reason: "not_verified", mine: null };
  if (!subjectParty.uid) return { ...base, canReview: false, reason: "subject_not_member", mine: null };
  return { ...base, canReview: true, reason: "ok", mine: null };
}

/**
 * Writes one review inside the caller's transaction (deal already loaded and authorised).
 * READS first (own + counterpart review), then WRITES. One review per side per deal.
 */
export async function submitReviewInTx(
  tx: Transaction,
  dealRef: DocumentReference,
  deal: DealDoc,
  reviewerSide: Side,
  reviewer: { uid: string | null; name: string; via: "account" | "link" },
  input: ReviewInput,
): Promise<void> {
  const db = adminDb();
  const mineRef = db.collection(C.reviews).doc(reviewId(dealRef.id, reviewerSide));
  const theirsRef = db.collection(C.reviews).doc(reviewId(dealRef.id, other(reviewerSide)));
  const [mine, theirs] = await Promise.all([tx.get(mineRef), tx.get(theirsRef)]);
  const state = reviewStateFor(deal, reviewerSide, mine);
  if (!state.canReview) {
    const msg = { already_reviewed: "You've already reviewed this collaboration.", not_verified: "Reviews open once both sides confirm the collaboration is complete.", subject_not_member: "This client isn't on CreatorsAI yet, so there's no profile to review.", ok: "" }[state.reason];
    throw new ApiError(409, state.reason, msg);
  }
  const cleaned = cleanReviewText(input.text);
  if (!cleaned.ok) throw new ApiError(400, "validation_failed", cleaned.error);

  const subjectParty = state.subject === "creator" ? deal.creatorSide : deal.brandSide;
  const nowMs = Date.now();
  const counterpart = theirs.exists;
  tx.create(mineRef, {
    dealId: dealRef.id,
    dealTitle: deal.title.slice(0, 120),
    subjectUid: subjectParty.uid,
    subjectRole: state.subject,
    reviewerSide,
    reviewerUid: reviewer.uid,
    reviewerName: reviewer.name.slice(0, 80),
    via: reviewer.via,
    rating: input.rating,
    tags: validTags(state.subject, input.tags),
    text: cleaned.text,
    hidden: false,
    reported: false,
    revealAt: Timestamp.fromMillis(revealAtMs(nowMs, counterpart)),
    createdAt: FieldValue.serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
  });
  // Both sides have now reviewed → reveal both immediately (double-blind ends).
  if (counterpart) tx.update(theirsRef, { revealAt: Timestamp.fromMillis(nowMs) });
  notifyIn(tx, subjectParty.uid, {
    type: "review_received",
    title: `${reviewer.name} reviewed your collaboration`,
    body: counterpart ? "Both reviews are now public on your profile." : "It becomes public when you leave yours — or in 14 days.",
    href: `/dashboard/deals/${dealRef.id}`,
  });
  auditIn(tx, { actorUid: reviewer.uid ?? "link", actorRole: reviewer.uid ? "user" : "public", action: "review.created", targetType: "deal", targetId: dealRef.id, meta: { reviewerSide, rating: input.rating } });
}
