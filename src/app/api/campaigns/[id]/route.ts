import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { todayIST } from "@/lib/deals";
import { LIMITS_BY_TIER } from "@/lib/plans";
import { getTier } from "@/lib/server/plans";
import { getReliability } from "@/lib/server/insights";
import { campaignActionSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireMember } from "@/lib/server/auth";
import { idOk, type CampaignDoc } from "@/lib/server/campaigns";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  const ctx = await requireMember(req);
  const { id } = await params;
  if (!idOk(id)) throw new ApiError(404, "not_found", "Campaign not found");
  const db = adminDb();
  const snap = await db.collection(C.campaigns).doc(id).get();
  const c = snap.data() as CampaignDoc | undefined;
  const isOwner = c?.brandUid === ctx.uid;
  if (!c || (!isOwner && c.status !== "open")) throw new ApiError(404, "not_found", "Campaign not found");
  let myApplication: unknown = null;
  if (!isOwner) {
    const a = await db.collection(C.applications).doc(`${id}_${ctx.uid}`).get();
    if (a.exists) myApplication = { id: a.id, ...a.data() };
  }
  const brandReliability = (await getReliability(c.brandUid))?.asBrand ?? null;
  return json(serialize({ item: { id, ...c }, isOwner, myApplication, brandReliability }));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const { id } = await params;
  if (!idOk(id)) throw new ApiError(404, "not_found", "Campaign not found");
  const body = await readJson(req, campaignActionSchema);
  const db = adminDb();
  const ref = db.collection(C.campaigns).doc(id);
  const verified = (await db.collection(C.brandProfiles).doc(ctx.uid).get()).get("verified") === true;
  const { tier } = await getTier(ctx.uid);
  const openCount = body.action === "open" ? (await db.collection(C.campaigns).where("brandUid", "==", ctx.uid).where("status", "==", "open").count().get()).data().count : 0;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const c = snap.data() as CampaignDoc | undefined;
    if (!c || c.brandUid !== ctx.uid) throw new ApiError(404, "not_found", "Campaign not found");
    const now = FieldValue.serverTimestamp();
    if (body.action === "update") {
      if (c.status === "closed") throw new ApiError(409, "locked", "Closed campaigns can't be edited.");
      if (c.applicationsCount > 0 && c.status === "open") throw new ApiError(409, "locked", "Creators have applied — close this campaign and post a new one to change the brief.");
      const { status: _ignored, ...rest } = body.campaign;
      void _ignored;
      tx.update(ref, { ...rest, updatedAt: now });
    } else if (body.action === "open") {
      if (!verified) throw new ApiError(403, "brand_unverified", "Verify your business to publish campaigns.");
      if (c.applyBy < todayIST()) throw new ApiError(400, "expired", "Update the apply-by date first.");
      if (openCount >= LIMITS_BY_TIER[tier].openCampaigns) {
        throw new ApiError(402, "plan_limit", tier === "free" ? "The free plan includes 1 open brief. Upgrade to Growth for up to 10." : "Close an open campaign before publishing another.");
      }
      tx.update(ref, { status: "open", brandVerified: true, featured: LIMITS_BY_TIER[tier].featuredBriefs, updatedAt: now });
    } else {
      tx.update(ref, { status: "closed", updatedAt: now });
    }
    auditIn(tx, { actorUid: ctx.uid, actorRole: "user", action: `campaign.${body.action}`, targetType: "campaign", targetId: id });
  });
  return json({ ok: true });
});
