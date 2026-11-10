import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { after } from "next/server";
import { alertMember } from "@/lib/server/whatsapp";
import { adminDb } from "@/lib/firebase/admin";
import { LIMITS, site } from "@/lib/config";
import { otherSide, todayIST } from "@/lib/deals";
import { generateInviteCode, shortId, trackingCode } from "@/lib/ids";
import { dealActionSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireMember } from "@/lib/server/auth";
import { notifyIn } from "@/lib/server/notify";
import { C } from "@/lib/server/collections";
import { sha256 } from "@/lib/server/crypto";
import { buildDeliverables, dealRef, loadMemberDeal, maybeRecordVerifiedCompletion, termsHash, termsOf, toClientDeal, type DealDoc } from "@/lib/server/deals";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

const SHARE_LINK_TTL_DAYS = 60;

export const GET = route<Ctx>(async (req, { params }) => {
  const ctx = await requireMember(req);
  const { id } = await params;
  const snap = await dealRef(id).get();
  const deal = snap.data() as DealDoc | undefined;
  if (!deal || !deal.memberUids.includes(ctx.uid)) throw new ApiError(404, "not_found", "Deal not found");
  return json({ item: toClientDeal(id, deal) });
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const { id } = await params;
  const body = await readJson(req, dealActionSchema);
  const db = adminDb();
  const nowIso = new Date().toISOString();
  const me = { at: nowIso, by: ctx.uid, via: "account" as const };

  const alerts: Array<() => Promise<void>> = [];
  const result = await db.runTransaction(async (tx) => {
    alerts.length = 0; // transactions can retry: only the final attempt's alerts are sent
    const { ref, deal, side, isPodMember } = await loadMemberDeal(tx, id, ctx.uid);
    if (isPodMember) {
      const own = body.action === "deliverable_status" && deal.deliverables.find((d) => d.id === body.deliverableId)?.assigneeUid === ctx.uid;
      if (!own) throw new ApiError(403, "forbidden", "Pod members can update their own assigned deliverables. The pod lead manages everything else.");
    }
    const external = otherSide(side);
    const externalIsOffPlatform = !(external === "creator" ? deal.creatorSide.uid : deal.brandSide.uid);
    const isEditor = deal.createdBy === ctx.uid;
    const live = deal.status !== "cancelled";
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    const otherUid = external === "creator" ? deal.creatorSide.uid : deal.brandSide.uid;
    const myName = side === "creator" ? deal.creatorSide.name : deal.brandSide.name;
    const href = `/dashboard/deals/${id}`;
    let shareUrl: string | null = null;

    // Pre-reads for actions that touch other documents (transactions require reads before writes).
    let trackingSnapExists = false;
    let newCode: string | null = null;
    if (body.action === "set_tracking" && body.destinationUrl && !deal.tracking.code) {
      newCode = trackingCode();
      trackingSnapExists = (await tx.get(db.collection(C.trackingLinks).doc(newCode))).exists;
      if (trackingSnapExists) throw new ApiError(409, "retry", "Please try again.");
    }

    switch (body.action) {
      case "update_terms": {
        if (!isEditor) throw new ApiError(403, "forbidden", "Only the person who created this deal can edit its terms.");
        if (deal.status !== "active") throw new ApiError(409, "locked", "Completed or cancelled deals can't be edited.");
        const t = body.terms;
        const hash = termsHash(t, deal.creatorSide.name, deal.brandSide.name);
        Object.assign(update, {
          title: t.title,
          deliverables: buildDeliverables(t.deliverables, deal.deliverables),
          compensationType: t.compensationType,
          feeAmount: t.feeAmount,
          paymentTerms: t.paymentTerms,
          paymentDueDate: t.paymentDueDate,
          usageRights: t.usageRights,
          revisionLimit: t.revisionLimit,
          termsHash: hash,
        });
        if (hash !== deal.termsHash) {
          // Changed terms must be re-agreed by the other party.
          update.acceptance = { creator: side === "creator" ? me : null, brand: side === "brand" ? me : null };
          auditIn(tx, { actorUid: ctx.uid, actorRole: "user", action: "deal.terms_changed", targetType: "deal", targetId: id });
        }
        break;
      }
      case "update_counterparty": {
        if (!isEditor || !externalIsOffPlatform) throw new ApiError(403, "forbidden", "You can only edit details of an off-platform client you added.");
        const cp = { uid: null, name: body.counterparty.name, phone: body.counterparty.phone, email: body.counterparty.email };
        const creatorName = external === "creator" ? cp.name : deal.creatorSide.name;
        const brandName = external === "brand" ? cp.name : deal.brandSide.name;
        const hash = termsHash(termsOf(deal), creatorName, brandName);
        update[external === "creator" ? "creatorSide" : "brandSide"] = cp;
        if (hash !== deal.termsHash) {
          update.termsHash = hash;
          update.acceptance = { ...deal.acceptance, [external]: null };
        }
        break;
      }
      case "accept_terms": {
        if (!live) throw new ApiError(409, "locked", "This deal was cancelled.");
        update[`acceptance.${side}`] = me;
        notifyIn(tx, otherUid, { type: "terms_agreed", title: `${myName} agreed to the terms`, body: deal.title, href });
        break;
      }
      case "deliverable_status": {
        if (!live) throw new ApiError(409, "locked", "This deal was cancelled.");
        const idx = deal.deliverables.findIndex((d) => d.id === body.deliverableId);
        if (idx === -1) throw new ApiError(404, "not_found", "Deliverable not found");
        const next = deal.deliverables.map((d, i) => {
          if (i !== idx) return d;
          const updated = { ...d, status: body.status, proofUrl: body.proofUrl || d.proofUrl };
          // Record first delivery date (on-time evidence); clear it if work is reopened.
          if (body.status === "pending") delete (updated as { deliveredAt?: string }).deliveredAt;
          else if (!d.deliveredAt) updated.deliveredAt = todayIST();
          return updated;
        });
        update.deliverables = next;
        if (body.status === "submitted" && side === "creator") {
          const d = deal.deliverables[idx]!;
          notifyIn(tx, otherUid, { type: "deliverable_delivered", title: `${myName} delivered: ${d.qty}× ${d.type}`, body: deal.title, href });
        }
        break;
      }
      case "add_payment": {
        if (!live) throw new ApiError(409, "locked", "This deal was cancelled.");
        if (deal.payments.length >= LIMITS.paymentsPerDeal) throw new ApiError(400, "limit_reached", "Too many payments on one deal.");
        update.payments = FieldValue.arrayUnion({ id: shortId(), amount: body.amount, date: body.date, method: body.method, note: body.note, recordedBy: ctx.uid });
        if (side === "brand") {
          const amt = body.amount;
          alerts.push(() => alertMember(otherUid, myName, { kind: "payment", title: deal.title, amount: amt }, `/dashboard/deals/${id}`));
          notifyIn(tx, otherUid, { type: "payment_recorded", title: `${myName} recorded a payment of ₹${body.amount.toLocaleString("en-IN")}`, body: deal.title, href });
        }
        break;
      }
      case "remove_payment": {
        const p = deal.payments.find((x) => x.id === body.paymentId);
        if (!p) throw new ApiError(404, "not_found", "Payment not found");
        if (p.recordedBy !== ctx.uid) throw new ApiError(403, "forbidden", "Only the person who recorded a payment can remove it.");
        update.payments = deal.payments.filter((x) => x.id !== body.paymentId);
        auditIn(tx, { actorUid: ctx.uid, actorRole: "user", action: "deal.payment_removed", targetType: "deal", targetId: id, meta: { amount: p.amount } });
        break;
      }
      case "set_tracking": {
        const code = deal.tracking.code ?? newCode;
        update.tracking = { ...deal.tracking, code, destinationUrl: body.destinationUrl, promoCode: body.promoCode };
        if (code) {
          tx.set(db.collection(C.trackingLinks).doc(code), { dealId: id, destination: body.destinationUrl, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
        break;
      }
      case "redemption": {
        const nextVal = Math.max(0, (deal.tracking.redemptions ?? 0) + body.delta);
        update["tracking.redemptions"] = nextVal;
        break;
      }
      case "confirm_complete": {
        if (!live) throw new ApiError(409, "locked", "This deal was cancelled.");
        const completion = { ...deal.completion, [side]: me };
        update[`completion.${side}`] = me;
        update.status = "completed";
        if (maybeRecordVerifiedCompletion(tx, ref, deal, completion)) update.verifiedCompletion = true;
        notifyIn(tx, otherUid, { type: "completion_confirmed", title: `${myName} marked the deal complete`, body: `Confirm on your side to add it to the verified record — ${deal.title}`, href });
        auditIn(tx, { actorUid: ctx.uid, actorRole: "user", action: "deal.completed_confirmed", targetType: "deal", targetId: id, meta: { side } });
        break;
      }
      case "cancel": {
        if (deal.status === "completed") throw new ApiError(409, "locked", "Completed deals can't be cancelled.");
        update.status = "cancelled";
        update.cancelReason = body.reason;
        auditIn(tx, { actorUid: ctx.uid, actorRole: "user", action: "deal.cancelled", targetType: "deal", targetId: id });
        break;
      }
      case "auto_reminders": {
        if (side !== "creator" || isPodMember) throw new ApiError(403, "forbidden", "Only the creator side can turn on payment reminders.");
        if (body.enabled && !deal.counterpartyWa) throw new ApiError(409, "not_opted_in", "Your client needs to opt in to WhatsApp updates from the agreement link first.");
        update.autoReminders = body.enabled;
        break;
      }
      case "share_link": {
        if (!externalIsOffPlatform) throw new ApiError(409, "not_needed", "Both parties are on CreatorsAI — they can see this deal in their dashboard.");
        if (!live) throw new ApiError(409, "locked", "This deal was cancelled.");
        const token = generateInviteCode();
        const hash = sha256(token);
        if (deal.shareLinkHash) tx.delete(db.collection(C.dealLinks).doc(deal.shareLinkHash));
        tx.create(db.collection(C.dealLinks).doc(hash), {
          dealId: id,
          side: external,
          createdBy: ctx.uid,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: Timestamp.fromMillis(Date.now() + SHARE_LINK_TTL_DAYS * 86_400_000),
        });
        update.shareLinkHash = hash;
        shareUrl = `${site.url}/d/${token}`;
        break;
      }
    }

    tx.update(ref, update);
    return { shareUrl };
  });

  for (const f of alerts) after(f);
  const fresh = await dealRef(id).get();
  return json({ item: toClientDeal(id, fresh.data() as DealDoc), shareUrl: result.shareUrl });
});
