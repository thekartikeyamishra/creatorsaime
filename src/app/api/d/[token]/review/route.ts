import { adminDb } from "@/lib/firebase/admin";
import { linkReviewSchema } from "@/lib/schemas";
import { C } from "@/lib/server/collections";
import { sha256 } from "@/lib/server/crypto";
import { TOKEN_RE } from "@/lib/server/deal-links";
import type { DealDoc } from "@/lib/server/deals";
import { ApiError, assertSameOrigin, clientIp, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { reviewId, reviewStateFor, submitReviewInTx } from "@/lib/server/reviews";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ token: string }> };

async function resolve(tx: FirebaseFirestore.Transaction, token: string) {
  const db = adminDb();
  const hash = sha256(token);
  const link = await tx.get(db.collection(C.dealLinks).doc(hash));
  if (!link.exists || link.get("expiresAt").toMillis() < Date.now()) throw new ApiError(404, "not_found", "This link has expired. Ask for a new one.");
  const ref = db.collection(C.deals).doc(link.get("dealId") as string);
  const snap = await tx.get(ref);
  const deal = snap.data() as DealDoc | undefined;
  if (!deal || deal.shareLinkHash !== hash) throw new ApiError(404, "not_found", "This link has been replaced by a newer one.");
  const side = link.get("side") as "creator" | "brand";
  const party = side === "creator" ? deal.creatorSide : deal.brandSide;
  if (party.uid) throw new ApiError(409, "not_allowed", "This party has an account — please sign in to review.");
  return { ref, deal, side, party };
}

/** Review state for the off-platform client holding the private link. */
export const GET = route<Ctx>(async (_req, { params }) => {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) throw new ApiError(404, "not_found", "This link is not valid.");
  const db = adminDb();
  const state = await db.runTransaction(async (tx) => {
    const { ref, deal, side } = await resolve(tx, token);
    const mine = await tx.get(db.collection(C.reviews).doc(reviewId(ref.id, side)));
    return reviewStateFor(deal, side, mine);
  });
  return json({ review: state });
});

/** Off-platform client reviews the creator — labelled "client via private deal link" publicly. */
export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const { token } = await params;
  if (!TOKEN_RE.test(token)) throw new ApiError(404, "not_found", "This link is not valid.");
  await enforceRateLimit({ bucket: "deal-review-ip", limit: 10, windowSeconds: 3600 }, clientIp(req));
  const input = await readJson(req, linkReviewSchema);
  await adminDb().runTransaction(async (tx) => {
    const { ref, deal, side, party } = await resolve(tx, token);
    await submitReviewInTx(tx, ref, deal, side, { uid: null, name: party.name || input.name, via: "link" }, input);
  });
  return json({ ok: true }, 201);
});
