import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { POLICY_VERSION } from "@/lib/config";
import { WA_LIMITS } from "@/lib/whatsapp";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { safeEqual, sha256 } from "@/lib/server/crypto";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";

export const runtime = "nodejs";

const schema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") });

/** Step 2: confirm the code; records explicit, versioned consent for WhatsApp alerts. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  const { code } = await readJson(req, schema);
  const db = adminDb();
  const ref = db.collection(C.users).doc(ctx.uid);
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const p = snap.get("whatsappPending") as { waId: string; codeHash: string; expiresAt: Timestamp; attempts: number } | undefined;
    if (!p) throw new ApiError(409, "no_pending", "Request a new code first.");
    if (p.expiresAt.toMillis() < Date.now()) throw new ApiError(410, "expired", "That code expired. Request a new one.");
    if (p.attempts >= WA_LIMITS.otpMaxAttempts) throw new ApiError(429, "too_many_attempts", "Too many attempts. Request a new code.");
    if (!safeEqual(sha256(`${ctx.uid}:${code}`), p.codeHash)) {
      tx.update(ref, { "whatsappPending.attempts": p.attempts + 1 });
      return { ok: false as const };
    }
    tx.update(ref, {
      whatsapp: { waId: p.waId, verified: true, alerts: true, digest: true, optedInAt: Timestamp.now() },
      whatsappPending: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(db.collection(C.consentRecords).doc(), {
      subjectType: "user", subjectId: ctx.uid, uid: ctx.uid, purpose: "whatsapp_alerts", granted: true, policyVersion: POLICY_VERSION, source: "whatsapp_otp", at: Timestamp.now(),
    });
    return { ok: true as const };
  });
  if (!result.ok) throw new ApiError(400, "wrong_code", "That code isn't right. Check WhatsApp and try again.");
  return json({ ok: true });
});
