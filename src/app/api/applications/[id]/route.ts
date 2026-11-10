import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { applicationActionSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireMember } from "@/lib/server/auth";
import { idOk, type CampaignDoc } from "@/lib/server/campaigns";
import { C } from "@/lib/server/collections";
import { baseDealDoc } from "@/lib/server/deals";
import { notifyIn } from "@/lib/server/notify";
import { after } from "next/server";
import { alertMember } from "@/lib/server/whatsapp";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

type AppDoc = {
  campaignId: string;
  brandUid: string;
  brandName: string;
  creatorUid: string;
  creator: { displayName: string };
  proposedFee: number;
  status: "applied" | "shortlisted" | "accepted" | "declined" | "withdrawn";
  dealId: string | null;
  pod?: { podId: string; name: string; leadUid: string; members: Array<{ uid: string; name: string; role: string; sharePct: number }> } | null;
};

/**
 * Brand: shortlist / accept / decline. Creator: withdraw.
 * Accepting turns the application into a Deal on both dashboards — terms pre-filled from the brief.
 */
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const { id } = await params;
  if (!idOk(id)) throw new ApiError(404, "not_found", "Application not found");
  const { action, note } = await readJson(req, applicationActionSchema);
  const db = adminDb();
  const appRef = db.collection(C.applications).doc(id);

  const alerts: Array<() => Promise<void>> = [];
  const out = await db.runTransaction(async (tx) => {
    alerts.length = 0;
    const aSnap = await tx.get(appRef);
    const a = aSnap.data() as AppDoc | undefined;
    if (!a || (a.brandUid !== ctx.uid && a.creatorUid !== ctx.uid)) throw new ApiError(404, "not_found", "Application not found");
    const isBrand = a.brandUid === ctx.uid;
    const now = FieldValue.serverTimestamp();

    if (action === "withdraw") {
      if (isBrand) throw new ApiError(403, "forbidden", "Only the creator can withdraw.");
      if (a.status === "accepted") throw new ApiError(409, "locked", "Accepted applications become deals — cancel the deal instead.");
      tx.update(appRef, { status: "withdrawn", updatedAt: now });
      return { dealId: null };
    }
    if (!isBrand) throw new ApiError(403, "forbidden", "Only the brand can do that.");
    if (a.status === "accepted" || a.status === "withdrawn") throw new ApiError(409, "locked", `This application is already ${a.status}.`);

    if (action === "shortlist" || action === "decline") {
      tx.update(appRef, { status: action === "shortlist" ? "shortlisted" : "declined", brandNote: note, updatedAt: now });
      if (action === "shortlist") {
        notifyIn(tx, a.creatorUid, { type: "application_shortlisted", title: `${a.brandName} shortlisted you`, body: "You're in the running — keep an eye on your dashboard.", href: `/dashboard/campaigns/${a.campaignId}` });
      }
      return { dealId: null };
    }

    // accept → create the deal
    const cRef = db.collection(C.campaigns).doc(a.campaignId);
    const c = (await tx.get(cRef)).data() as CampaignDoc | undefined;
    if (!c) throw new ApiError(404, "not_found", "Campaign not found");
    const dealRef = db.collection(C.deals).doc();
    const dealDoc = baseDealDoc({
        terms: {
          title: c.title,
          deliverables: c.deliverables.map((d) => ({ type: d.type, qty: d.qty ?? 1, dueDate: d.dueDate ?? "", note: d.note ?? "" })),
          compensationType: c.compensationType,
          feeAmount: c.compensationType === "barter" ? 0 : a.proposedFee,
          paymentTerms: "",
          paymentDueDate: "",
          usageRights: c.usageRights ?? "",
          revisionLimit: 2,
        },
        creatorSide: { uid: a.creatorUid, name: a.pod ? a.pod.name : a.creator.displayName },
        brandSide: { uid: a.brandUid, name: a.brandName },
        createdBy: ctx.uid,
        source: "campaign",
        campaignId: a.campaignId,
        acceptedSide: "brand",
        completed: false,
      });
    if (a.pod) {
      dealDoc.pod = a.pod;
      dealDoc.payouts = [];
      dealDoc.memberUids = [...new Set([a.brandUid, ...a.pod.members.map((m) => m.uid)])];
      for (const m of a.pod.members) {
        if (m.uid === a.creatorUid) continue;
        notifyIn(tx, m.uid, { type: "pod_hired", title: `Your pod "${a.pod.name}" was hired: ${c.title}`, body: `Your role: ${m.role} · ${m.sharePct}% share`, href: `/dashboard/deals/${dealRef.id}` });
      }
    }
    tx.create(dealRef, dealDoc);
    tx.update(appRef, { status: "accepted", dealId: dealRef.id, brandNote: note, updatedAt: now });
    tx.update(cRef, { acceptedCount: FieldValue.increment(1), updatedAt: now });
    alerts.push(() => alertMember(a.creatorUid, a.brandName, { kind: "hired", title: c.title }, `/dashboard/deals/${dealRef.id}`));
    notifyIn(tx, a.creatorUid, { type: "application_accepted", title: `You're hired: ${c.title}`, body: `${a.brandName} accepted your application. Review and agree to the terms.`, href: `/dashboard/deals/${dealRef.id}` });
    auditIn(tx, { actorUid: ctx.uid, actorRole: "user", action: "application.accepted", targetType: "application", targetId: id, meta: { dealId: dealRef.id } });
    return { dealId: dealRef.id };
  });
  for (const f of alerts) after(f);
  return json({ ok: true, ...out });
});
