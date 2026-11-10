import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { POLICY_VERSION } from "@/lib/config";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const schema = z.object({ marketing: z.boolean() });

/** Grant or withdraw marketing consent. Withdrawal is as easy as granting (DPDP s.6(4)). */
export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const { marketing } = await readJson(req, schema);
  const db = adminDb();
  const batch = db.batch();
  batch.update(db.collection(C.users).doc(ctx.uid), { marketingConsent: marketing, updatedAt: FieldValue.serverTimestamp() });
  batch.create(db.collection(C.consentRecords).doc(), {
    subjectType: "user",
    subjectId: ctx.uid,
    uid: ctx.uid,
    purpose: "marketing",
    granted: marketing,
    policyVersion: POLICY_VERSION,
    source: "account_settings",
    at: Timestamp.now(),
  });
  await batch.commit();
  return json({ ok: true, marketing });
});
