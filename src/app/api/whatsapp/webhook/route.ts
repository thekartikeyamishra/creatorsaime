import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { POLICY_VERSION } from "@/lib/config";
import { isStopMessage } from "@/lib/whatsapp";
import { C } from "@/lib/server/collections";
import { keyedHash, safeEqual } from "@/lib/server/crypto";
import { verifyMetaSignature } from "@/lib/server/whatsapp";

export const runtime = "nodejs";

/** Meta webhook verification handshake. */
export function GET(req: Request): Response {
  const u = new URL(req.url);
  const token = process.env.WHATSAPP_VERIFY_TOKEN || "";
  if (u.searchParams.get("hub.mode") === "subscribe" && token && safeEqual(u.searchParams.get("hub.verify_token") || "", token)) {
    return new Response(u.searchParams.get("hub.challenge") || "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

type Change = {
  value?: {
    statuses?: Array<{ id: string; status: string; errors?: Array<{ code: number; title?: string }> }>;
    messages?: Array<{ from: string; type: string; text?: { body: string }; button?: { text: string } }>;
  };
};

/**
 * Delivery statuses + inbound messages. "STOP" (and Hindi equivalents) immediately opts the
 * sender out everywhere: member alerts and any deal reminders addressed to that number.
 */
export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  if (raw.length > 500_000) return new Response("too large", { status: 413 });
  if (!verifyMetaSignature(raw, req.headers.get("x-hub-signature-256"))) return new Response("invalid signature", { status: 401 });
  let body: { entry?: Array<{ changes?: Change[] }> };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  const db = adminDb();
  try {
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        for (const s of change.value?.statuses ?? []) {
          await db.collection(C.whatsappMessages).doc(s.id).set({ status: s.status, error: s.errors?.[0] ? `${s.errors[0].code}:${s.errors[0].title ?? ""}` : null, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        }
        for (const m of change.value?.messages ?? []) {
          const text = m.text?.body ?? m.button?.text ?? "";
          if (!isStopMessage(text)) continue;
          const waId = m.from;
          const batch = db.batch();
          const users = await db.collection(C.users).where("whatsapp.waId", "==", waId).limit(10).get();
          for (const u of users.docs) {
            batch.update(u.ref, { whatsapp: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
            batch.create(db.collection(C.consentRecords).doc(), { subjectType: "user", subjectId: u.id, uid: u.id, purpose: "whatsapp_alerts", granted: false, policyVersion: POLICY_VERSION, source: "whatsapp_stop", at: Timestamp.now() });
          }
          const deals = await db.collection(C.deals).where("counterpartyWa.waId", "==", waId).limit(200).get();
          for (const d of deals.docs) batch.update(d.ref, { counterpartyWa: FieldValue.delete(), autoReminders: false });
          batch.create(db.collection(C.consentRecords).doc(), { subjectType: "phone", subjectId: keyedHash(waId), uid: null, purpose: "whatsapp_all", granted: false, policyVersion: POLICY_VERSION, source: "whatsapp_stop", at: Timestamp.now() });
          await batch.commit();
        }
      }
    }
  } catch (err) {
    console.error("[wa-webhook] processing error", err);
    return new Response("retry", { status: 500 });
  }
  return new Response("ok", { status: 200 });
}
