import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { billingSchema } from "@/lib/schemas";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

/** Private invoicing + payout details. Never shown publicly; UPI ID only appears on your own invoices/reminders. */
export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  const snap = await adminDb().collection(C.billingProfiles).doc(ctx.uid).get();
  return json(serialize({ billing: snap.exists ? snap.data() : null }));
});

export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const input = await readJson(req, billingSchema);
  const ref = adminDb().collection(C.billingProfiles).doc(ctx.uid);
  // merge: keeps the invoice counter intact.
  await ref.set({ ...input, uid: ctx.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return json({ ok: true });
});
