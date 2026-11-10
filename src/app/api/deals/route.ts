import { adminDb } from "@/lib/firebase/admin";
import { LIMITS } from "@/lib/config";
import { dealCreateSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { baseDealDoc, toClientDeal, type DealDoc } from "@/lib/server/deals";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/** All deals I'm part of (on-platform or tracked with an off-platform client). */
export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  const snap = await adminDb()
    .collection(C.deals)
    .where("memberUids", "array-contains", ctx.uid)
    .orderBy("updatedAt", "desc")
    .limit(LIMITS.activeDealsPerUser)
    .get();
  return json({ items: snap.docs.map((d) => toClientDeal(d.id, d.data() as DealDoc)) });
});

/**
 * "Bring your own deal": log any collaboration — including ones arranged on WhatsApp or by phone
 * with clients who aren't on CreatorsAI. Day-one value without needing the network.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const input = await readJson(req, dealCreateSchema);
  const db = adminDb();

  const count = (await db.collection(C.deals).where("memberUids", "array-contains", ctx.uid).count().get()).data().count;
  if (count >= LIMITS.activeDealsPerUser) throw new ApiError(400, "limit_reached", "You've reached the deal limit. Contact support to raise it.");

  const me = { uid: ctx.uid, name: ctx.user.displayName };
  const other = { uid: null, name: input.counterparty.name, phone: input.counterparty.phone, email: input.counterparty.email };
  const iAmBrand = ctx.user.role === "brand";

  const ref = db.collection(C.deals).doc();
  const batch = db.batch();
  batch.create(
    ref,
    baseDealDoc({
      terms: input.terms,
      creatorSide: iAmBrand ? other : me,
      brandSide: iAmBrand ? me : other,
      createdBy: ctx.uid,
      source: "manual",
      campaignId: null,
      acceptedSide: iAmBrand ? "brand" : "creator",
      completed: input.status === "completed",
    }),
  );
  auditIn(batch, { actorUid: ctx.uid, actorRole: "user", action: "deal.created", targetType: "deal", targetId: ref.id, meta: { source: "manual" } });
  await batch.commit();
  const created = await ref.get();
  return json({ item: toClientDeal(ref.id, created.data() as DealDoc) }, 201);
});
