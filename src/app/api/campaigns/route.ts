import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { SCHEMA_VERSION } from "@/lib/config";
import { LIMITS_BY_TIER } from "@/lib/plans";
import { getTier } from "@/lib/server/plans";
import { getReliabilityMany } from "@/lib/server/insights";
import { todayIST } from "@/lib/deals";
import { campaignSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

const query = z.object({ scope: z.enum(["mine", "open"]).default("open") });

export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  const { scope } = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const db = adminDb();
  if (scope === "mine") {
    if (ctx.user.role !== "brand") throw new ApiError(403, "wrong_role", "Only brands create campaigns.");
    const snap = await db.collection(C.campaigns).where("brandUid", "==", ctx.uid).orderBy("createdAt", "desc").limit(100).get();
    return json(serialize({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }));
  }
  const today = todayIST();
  const snap = await db.collection(C.campaigns).where("status", "==", "open").orderBy("createdAt", "desc").limit(100).get();
  // Featured (Growth) briefs first, then newest.
  const items = snap.docs
    .filter((d) => (d.get("applyBy") as string) >= today)
    .map((d) => ({ id: d.id, brandUid: d.get("brandUid") as string, ...d.data() }))
    .sort((a, b) => Number(Boolean((b as { featured?: boolean }).featured)) - Number(Boolean((a as { featured?: boolean }).featured)));
  const rel = await getReliabilityMany(items.map((c) => c.brandUid));
  return json(serialize({ items: items.map((c) => ({ ...c, brandReliability: rel[c.brandUid]?.asBrand ?? null })) }));
});

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  if (ctx.user.role !== "brand") throw new ApiError(403, "wrong_role", "Only brand accounts can post campaigns.");
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const input = await readJson(req, campaignSchema);
  if (input.applyBy < todayIST()) throw new ApiError(400, "validation_failed", "Apply-by date is in the past.");
  const db = adminDb();
  const profile = await db.collection(C.brandProfiles).doc(ctx.uid).get();
  const verified = profile.get("verified") === true;
  const { tier } = await getTier(ctx.uid);
  if (input.status === "open") {
    if (!verified) throw new ApiError(403, "brand_unverified", "Verify your business to publish campaigns. You can save this as a draft now.");
    const open = (await db.collection(C.campaigns).where("brandUid", "==", ctx.uid).where("status", "==", "open").count().get()).data().count;
    if (open >= LIMITS_BY_TIER[tier].openCampaigns) {
      throw new ApiError(402, "plan_limit", tier === "free" ? "The free plan includes 1 open brief. Upgrade to Growth for up to 10, or close your open brief first." : "Close an open campaign before publishing another.");
    }
  }
  const ref = db.collection(C.campaigns).doc();
  const batch = db.batch();
  batch.create(ref, {
    ...input,
    brandUid: ctx.uid,
    brandName: (profile.get("displayName") as string) || ctx.user.displayName,
    brandHandle: ctx.user.handle,
    brandVerified: verified,
    featured: input.status === "open" && LIMITS_BY_TIER[tier].featuredBriefs,
    applicationsCount: 0,
    acceptedCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
  });
  auditIn(batch, { actorUid: ctx.uid, actorRole: "user", action: `campaign.created_${input.status}`, targetType: "campaign", targetId: ref.id });
  await batch.commit();
  return json({ id: ref.id }, 201);
});
