import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { POLICY_VERSION } from "@/lib/config";
import { maskPhone } from "@/lib/whatsapp";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { whatsappConfigured } from "@/lib/server/whatsapp";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  const snap = await adminDb().collection(C.users).doc(ctx.uid).get();
  const wa = snap.get("whatsapp") as { waId: string; alerts: boolean; digest: boolean } | undefined;
  return json({ available: whatsappConfigured(), connected: Boolean(wa), number: wa ? maskPhone(wa.waId) : null, alerts: wa?.alerts ?? false, digest: wa?.digest ?? false });
});

const schema = z.object({ alerts: z.boolean(), digest: z.boolean() });

export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  const body = await readJson(req, schema);
  const ref = adminDb().collection(C.users).doc(ctx.uid);
  const snap = await ref.get();
  if (!snap.get("whatsapp")) throw new ApiError(409, "not_connected", "Connect WhatsApp first.");
  await ref.update({ "whatsapp.alerts": body.alerts, "whatsapp.digest": body.digest, updatedAt: FieldValue.serverTimestamp() });
  return json({ ok: true });
});

/** Disconnect: removes the number and records the withdrawal of consent. */
export const DELETE = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  const db = adminDb();
  const batch = db.batch();
  batch.update(db.collection(C.users).doc(ctx.uid), { whatsapp: FieldValue.delete(), whatsappPending: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
  batch.create(db.collection(C.consentRecords).doc(), {
    subjectType: "user", subjectId: ctx.uid, uid: ctx.uid, purpose: "whatsapp_alerts", granted: false, policyVersion: POLICY_VERSION, source: "account_settings", at: Timestamp.now(),
  });
  await batch.commit();
  return json({ ok: true });
});
