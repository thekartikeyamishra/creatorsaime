import { adminDb } from "@/lib/firebase/admin";
import { reviewSchema } from "@/lib/schemas";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { loadMemberDeal } from "@/lib/server/deals";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";
import { reviewId, reviewStateFor, submitReviewInTx } from "@/lib/server/reviews";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/** Whether the signed-in member can review the other side of this deal. */
export const GET = route<Ctx>(async (req, { params }) => {
  const ctx = await requireMember(req);
  const { id } = await params;
  const db = adminDb();
  const state = await db.runTransaction(async (tx) => {
    const { deal, side, isPodMember } = await loadMemberDeal(tx, id, ctx.uid);
    if (isPodMember) return null;
    const mine = await tx.get(db.collection(C.reviews).doc(reviewId(id, side)));
    return reviewStateFor(deal, side, mine);
  });
  return json({ review: state });
});

export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const { id } = await params;
  const input = await readJson(req, reviewSchema);
  const db = adminDb();
  await db.runTransaction(async (tx) => {
    const { ref, deal, side, isPodMember } = await loadMemberDeal(tx, id, ctx.uid);
    if (isPodMember) throw new ApiError(403, "forbidden", "Only the lead creator can review this collaboration.");
    const party = side === "creator" ? deal.creatorSide : deal.brandSide;
    await submitReviewInTx(tx, ref, deal, side, { uid: ctx.uid, name: party.name, via: "account" }, input);
  });
  return json({ ok: true }, 201);
});
