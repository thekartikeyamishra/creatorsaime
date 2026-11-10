import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { received } from "@/lib/deals";
import { shortId } from "@/lib/ids";
import { payoutLines } from "@/lib/pods";
import { podDealActionSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireMember } from "@/lib/server/auth";
import { loadMemberDeal, toClientDeal, dealRef, type DealDoc } from "@/lib/server/deals";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { notifyIn } from "@/lib/server/notify";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/**
 * Pod coordination on a deal: the lead assigns deliverables and records payouts to members;
 * members confirm what they received. Creates a transparent split ledger both sides can see.
 */
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const { id } = await params;
  const body = await readJson(req, podDealActionSchema);
  const db = adminDb();

  await db.runTransaction(async (tx) => {
    const { ref, deal } = await loadMemberDeal(tx, id, ctx.uid);
    const pod = deal.pod;
    if (!pod) throw new ApiError(409, "not_pod", "This isn't a pod deal.");
    if (deal.status === "cancelled") throw new ApiError(409, "locked", "This deal was cancelled.");
    const isLead = pod.leadUid === ctx.uid;
    const memberIds = new Set(pod.members.map((m) => m.uid));
    const payouts = deal.payouts ?? [];
    const now = FieldValue.serverTimestamp();

    if (body.action === "assign_deliverable") {
      if (!isLead) throw new ApiError(403, "forbidden", "Only the pod lead assigns work.");
      if (body.assigneeUid && !memberIds.has(body.assigneeUid)) throw new ApiError(400, "invalid", "That person isn't in this pod.");
      const idx = deal.deliverables.findIndex((d) => d.id === body.deliverableId);
      if (idx === -1) throw new ApiError(404, "not_found", "Deliverable not found");
      const next = deal.deliverables.map((d, i) => {
        if (i !== idx) return d;
        const u = { ...d };
        if (body.assigneeUid) u.assigneeUid = body.assigneeUid;
        else delete u.assigneeUid;
        return u;
      });
      tx.update(ref, { deliverables: next, updatedAt: now });
      if (body.assigneeUid && body.assigneeUid !== ctx.uid) {
        const d = deal.deliverables[idx]!;
        notifyIn(tx, body.assigneeUid, { type: "pod_hired", title: `Assigned to you: ${d.qty}× ${d.type}`, body: `${deal.title}${d.dueDate ? ` · due ${d.dueDate}` : ""}`, href: `/dashboard/deals/${id}` });
      }
      return;
    }

    if (body.action === "record_payout") {
      if (!isLead) throw new ApiError(403, "forbidden", "Only the pod lead records payouts.");
      if (!memberIds.has(body.toUid) || body.toUid === pod.leadUid) throw new ApiError(400, "invalid", "Choose a pod member (not yourself).");
      if (payouts.length >= 100) throw new ApiError(400, "limit_reached", "Too many payouts on one deal.");
      const line = payoutLines(pod, deal.feeAmount, received(deal), payouts).find((l) => l.uid === body.toUid)!;
      if (line.paidOut + body.amount > line.entitledOnFee) {
        throw new ApiError(400, "over_share", `That's more than ${line.name}'s share of the fee (₹${line.entitledOnFee.toLocaleString("en-IN")}).`);
      }
      tx.update(ref, {
        payouts: FieldValue.arrayUnion({ id: shortId(), toUid: body.toUid, amount: body.amount, date: body.date, method: body.method, note: body.note, confirmedAt: null }),
        updatedAt: now,
      });
      notifyIn(tx, body.toUid, { type: "payout_recorded", title: `${ctx.user.displayName} recorded ₹${body.amount.toLocaleString("en-IN")} paid to you`, body: `${deal.title} — please confirm you received it.`, href: `/dashboard/deals/${id}` });
      auditIn(tx, { actorUid: ctx.uid, actorRole: "user", action: "deal.pod_payout_recorded", targetType: "deal", targetId: id, meta: { amount: body.amount } });
      return;
    }

    // confirm_payout
    const p = payouts.find((x) => x.id === body.payoutId);
    if (!p || p.toUid !== ctx.uid) throw new ApiError(404, "not_found", "Payout not found");
    if (p.confirmedAt) return;
    tx.update(ref, { payouts: payouts.map((x) => (x.id === p.id ? { ...x, confirmedAt: new Date().toISOString() } : x)), updatedAt: now });
    notifyIn(tx, pod.leadUid, { type: "payout_recorded", title: `${ctx.user.displayName} confirmed receiving ₹${p.amount.toLocaleString("en-IN")}`, body: deal.title, href: `/dashboard/deals/${id}` });
  });

  const fresh = await dealRef(id).get();
  return json({ item: toClientDeal(id, fresh.data() as DealDoc) });
});
