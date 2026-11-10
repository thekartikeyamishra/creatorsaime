import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { after } from "next/server";
import { POLICY_VERSION } from "@/lib/config";
import { toWaId, type AlertEvent } from "@/lib/whatsapp";
import { alertMember } from "@/lib/server/whatsapp";
import { adminDb } from "@/lib/firebase/admin";
import { publicDealActionSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { C } from "@/lib/server/collections";
import { sha256 } from "@/lib/server/crypto";
import { TOKEN_RE } from "@/lib/server/deal-links";
import { maybeRecordVerifiedCompletion, type DealDoc } from "@/lib/server/deals";
import { notifyIn } from "@/lib/server/notify";
import { ApiError, assertSameOrigin, clientIp, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/**
 * Off-platform client action via private link — no account needed.
 * This is the zero-friction loop: a WhatsApp-native business agrees to terms or confirms
 * completion in one tap, and sees what CreatorsAI does along the way.
 */
export const POST = route<{ params: Promise<{ token: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const { token } = await params;
  if (!TOKEN_RE.test(token)) throw new ApiError(404, "not_found", "This link is not valid.");
  await enforceRateLimit({ bucket: "deal-link-ip", limit: 30, windowSeconds: 3600 }, clientIp(req));
  const body = await readJson(req, publicDealActionSchema);
  const action = body.action;
  const name = "name" in body ? body.name : "";
  const pending: { alert: { uid: string; event: AlertEvent; dealId: string } | null } = { alert: null };
  const db = adminDb();
  const hash = sha256(token);

  await db.runTransaction(async (tx) => {
    const link = await tx.get(db.collection(C.dealLinks).doc(hash));
    if (!link.exists || link.get("expiresAt").toMillis() < Date.now()) throw new ApiError(404, "not_found", "This link has expired. Ask for a new one.");
    const dealId = link.get("dealId") as string;
    const side = link.get("side") as "creator" | "brand";
    const ref = db.collection(C.deals).doc(dealId);
    const snap = await tx.get(ref);
    const deal = snap.data() as DealDoc | undefined;
    if (!deal || deal.shareLinkHash !== hash) throw new ApiError(404, "not_found", "This link has been replaced by a newer one.");
    if (deal.status === "cancelled") throw new ApiError(409, "cancelled", "This deal was cancelled.");
    const party = side === "creator" ? deal.creatorSide : deal.brandSide;
    if (party.uid) throw new ApiError(409, "not_allowed", "This party has an account — please sign in.");

    const mark = { at: new Date().toISOString(), by: name, via: "link" as const };
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (action === "whatsapp_optin" || action === "whatsapp_optout") {
      // Explicit, per-deal opt-in by the client themself — required before we ever message them.
      if (action === "whatsapp_optin") {
        const waId = toWaId((body as { phone: string }).phone);
        if (!waId) throw new ApiError(400, "validation_failed", "Enter a valid WhatsApp number.");
        tx.update(ref, { counterpartyWa: { waId, name, lang: (body as { lang?: "en" | "hi" }).lang ?? "en", optedInAt: new Date().toISOString() }, updatedAt: FieldValue.serverTimestamp() });
      } else {
        tx.update(ref, { counterpartyWa: FieldValue.delete(), autoReminders: false, updatedAt: FieldValue.serverTimestamp() });
      }
      tx.create(db.collection(C.consentRecords).doc(), {
        subjectType: "deal_counterparty", subjectId: dealId, uid: null, purpose: "whatsapp_deal_updates", granted: action === "whatsapp_optin", policyVersion: POLICY_VERSION, source: "deal_link", at: Timestamp.now(),
      });
      auditIn(tx, { actorUid: null, actorRole: "public", action: `deal.link_${action}`, targetType: "deal", targetId: dealId, meta: { side } });
      return;
    }
    if (action === "accept_terms") {
      update[`acceptance.${side}`] = mark;
    } else {
      const completion = { ...deal.completion, [side]: mark };
      update[`completion.${side}`] = mark;
      if (maybeRecordVerifiedCompletion(tx, ref, deal, completion)) update.verifiedCompletion = true;
    }
    tx.update(ref, update);
    pending.alert = { uid: deal.createdBy, event: { kind: action === "accept_terms" ? "agreed" : "completed", title: deal.title }, dealId };
    notifyIn(tx, deal.createdBy, {
      type: action === "accept_terms" ? "terms_agreed" : "completion_confirmed",
      title: action === "accept_terms" ? `${name} agreed to the terms (via link)` : `${name} confirmed the work is complete`,
      body: deal.title,
      href: `/dashboard/deals/${dealId}`,
    });
    auditIn(tx, { actorUid: null, actorRole: "public", action: `deal.link_${action}`, targetType: "deal", targetId: dealId, meta: { side } });
  });

  if (pending.alert) {
    const a = pending.alert;
    after(() => alertMember(a.uid, name, a.event, `/dashboard/deals/${a.dealId}`));
  }
  return json({ ok: true });
});
