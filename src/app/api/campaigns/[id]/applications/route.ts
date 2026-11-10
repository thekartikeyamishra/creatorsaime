import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { SCHEMA_VERSION } from "@/lib/config";
import { todayIST } from "@/lib/deals";
import { applicationSchema } from "@/lib/schemas";
import { POD_LIMITS, sharesValid } from "@/lib/pods";
import type { PodDoc } from "@/lib/server/pods";
import { z } from "zod";
import { requireMember } from "@/lib/server/auth";
import { getReliabilityMany } from "@/lib/server/insights";
import { notifyIn } from "@/lib/server/notify";
import { after } from "next/server";
import { alertMember } from "@/lib/server/whatsapp";
import { idOk, type CampaignDoc } from "@/lib/server/campaigns";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/** Brand: list applications for my campaign. */
export const GET = route<Ctx>(async (req, { params }) => {
  const ctx = await requireMember(req);
  const { id } = await params;
  if (!idOk(id)) throw new ApiError(404, "not_found", "Campaign not found");
  const db = adminDb();
  const c = (await db.collection(C.campaigns).doc(id).get()).data() as CampaignDoc | undefined;
  if (!c || c.brandUid !== ctx.uid) throw new ApiError(404, "not_found", "Campaign not found");
  const snap = await db.collection(C.applications).where("campaignId", "==", id).orderBy("createdAt", "desc").limit(300).get();
  const rel = await getReliabilityMany(snap.docs.map((d) => d.get("creatorUid") as string));
  return json(serialize({ items: snap.docs.map((d) => ({ id: d.id, ...d.data(), reliability: rel[d.get("creatorUid") as string]?.asCreator ?? null })) }));
});

/** Creator: apply. Only ownership-verified creators can apply — that's the promise brands rely on. */
export const POST = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  if (ctx.user.role === "brand") throw new ApiError(403, "wrong_role", "Brands can't apply to campaigns.");
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const { id } = await params;
  if (!idOk(id)) throw new ApiError(404, "not_found", "Campaign not found");
  const input = await readJson(req, applicationSchema.extend({ podId: z.string().regex(/^[A-Za-z0-9]{1,128}$/).optional() }));
  const db = adminDb();
  if (input.podId) return applyAsPod(ctx, id, input as typeof input & { podId: string });
  const profile = (await db.collection(C.creatorProfiles).doc(ctx.uid).get()).data() ?? {};
  const verifiedPlatforms = Array.isArray(profile.verifiedPlatforms) ? (profile.verifiedPlatforms as string[]) : [];
  if (verifiedPlatforms.length === 0) throw new ApiError(403, "unverified", "Verify at least one social account to apply. It takes about 2 minutes.");

  const campaignRef = db.collection(C.campaigns).doc(id);
  const appRef = db.collection(C.applications).doc(`${id}_${ctx.uid}`);
  const completedDeals = (await db.collection(C.trustSignals).where("uid", "==", ctx.uid).where("public", "==", true).count().get()).data().count;

  const alerts: Array<() => Promise<void>> = [];
  await db.runTransaction(async (tx) => {
    alerts.length = 0;
    const [cSnap, aSnap] = await Promise.all([tx.get(campaignRef), tx.get(appRef)]);
    const c = cSnap.data() as CampaignDoc | undefined;
    if (!c || c.status !== "open") throw new ApiError(404, "not_found", "This campaign is not accepting applications.");
    if (c.applyBy < todayIST()) throw new ApiError(409, "closed", "Applications for this campaign have closed.");
    if (aSnap.exists) throw new ApiError(409, "already_applied", "You've already applied to this campaign.");
    tx.create(appRef, {
      campaignId: id,
      campaignTitle: c.title,
      brandUid: c.brandUid,
      brandName: c.brandName,
      creatorUid: ctx.uid,
      creator: {
        displayName: (profile.displayName as string) || ctx.user.displayName,
        handle: ctx.user.handle,
        city: (profile.city as string) || "",
        categories: Array.isArray(profile.categories) ? profile.categories : [],
        verifiedPlatforms,
        trustSignals: completedDeals,
        isPublic: profile.isPublic === true,
      },
      ...input,
      status: "applied",
      dealId: null,
      brandNote: "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      schemaVersion: SCHEMA_VERSION,
    });
    tx.update(campaignRef, { applicationsCount: FieldValue.increment(1) });
    const applicant = (profile.displayName as string) || ctx.user.displayName;
    alerts.push(() => alertMember(c.brandUid, applicant, { kind: "applied", title: c.title }, `/dashboard/campaigns/${id}`));
    notifyIn(tx, c.brandUid, {
      type: "application_received",
      title: `New application: ${c.title}`,
      body: `${(profile.displayName as string) || ctx.user.displayName} applied (₹${input.proposedFee.toLocaleString("en-IN")}).`,
      href: `/dashboard/campaigns/${id}`,
    });
  });
  for (const f of alerts) after(f);
  return json({ ok: true }, 201);
});

/**
 * Apply as a Creator Pod (lead only). Every active member must be ownership-verified and
 * shares must add up to 100% — brands get one coordinated, fully verified team.
 */
async function applyAsPod(
  ctx: Awaited<ReturnType<typeof requireMember>>,
  campaignId: string,
  input: { pitch: string; proposedFee: number; availableBy: string; podId: string },
) {
  const db = adminDb();
  const pod = (await db.collection(C.pods).doc(input.podId).get()).data() as PodDoc | undefined;
  if (!pod || pod.status !== "active") throw new ApiError(404, "not_found", "Pod not found");
  if (pod.leadUid !== ctx.uid) throw new ApiError(403, "forbidden", "Only the pod lead can apply on behalf of the pod.");
  const active = pod.members.filter((m) => m.status === "active");
  if (active.length < POD_LIMITS.minActiveToApply) throw new ApiError(400, "pod_too_small", "A pod needs at least 2 active members to apply.");
  if (!sharesValid(active)) throw new ApiError(400, "shares_invalid", "Active members' shares must add up to exactly 100%.");
  const profiles = await db.getAll(...active.map((m) => db.collection(C.creatorProfiles).doc(m.uid)));
  const unverified = active.filter((m, i) => !((profiles[i]?.get("verifiedPlatforms") as string[] | undefined)?.length));
  if (unverified.length) throw new ApiError(403, "unverified", `Every pod member must verify a social account first: ${unverified.map((m) => m.displayName).join(", ")}.`);
  const platforms = [...new Set(profiles.flatMap((p) => (p.get("verifiedPlatforms") as string[] | undefined) ?? []))];

  const campaignRef = db.collection(C.campaigns).doc(campaignId);
  const appRef = db.collection(C.applications).doc(`${campaignId}_pod_${input.podId}`);
  await db.runTransaction(async (tx) => {
    const [cSnap, aSnap] = await Promise.all([tx.get(campaignRef), tx.get(appRef)]);
    const c = cSnap.data() as CampaignDoc | undefined;
    if (!c || c.status !== "open") throw new ApiError(404, "not_found", "This campaign is not accepting applications.");
    if (c.applyBy < todayIST()) throw new ApiError(409, "closed", "Applications for this campaign have closed.");
    if (aSnap.exists) throw new ApiError(409, "already_applied", "This pod has already applied.");
    tx.create(appRef, {
      campaignId,
      campaignTitle: c.title,
      brandUid: c.brandUid,
      brandName: c.brandName,
      creatorUid: ctx.uid,
      creator: { displayName: `${pod.name} (pod)`, handle: ctx.user.handle, city: pod.city, categories: pod.categories, verifiedPlatforms: platforms, trustSignals: 0, isPublic: false },
      pod: { podId: input.podId, name: pod.name, leadUid: pod.leadUid, members: active.map((m) => ({ uid: m.uid, name: m.displayName, role: m.role, sharePct: m.sharePct })) },
      pitch: input.pitch,
      proposedFee: input.proposedFee,
      availableBy: input.availableBy,
      status: "applied",
      dealId: null,
      brandNote: "",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      schemaVersion: SCHEMA_VERSION,
    });
    tx.update(campaignRef, { applicationsCount: FieldValue.increment(1) });
    notifyIn(tx, c.brandUid, { type: "application_received", title: `Pod application: ${c.title}`, body: `${pod.name} — ${active.length} verified members (₹${input.proposedFee.toLocaleString("en-IN")} total).`, href: `/dashboard/campaigns/${campaignId}` });
  });
  return json({ ok: true }, 201);
}
