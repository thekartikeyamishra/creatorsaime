import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { after } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { phoneSchema } from "@/lib/schemas";
import { WA_LIMITS, toWaId } from "@/lib/whatsapp";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { sha256 } from "@/lib/server/crypto";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { newOtp, sendTemplate, TEMPLATES, whatsappConfigured } from "@/lib/server/whatsapp";

export const runtime = "nodejs";

const schema = z.object({ phone: phoneSchema.pipe(z.string().min(10, "Enter your WhatsApp number")) });

/** Step 1 of WhatsApp opt-in: send a 6-digit code to prove the member owns the number. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  if (!whatsappConfigured()) throw new ApiError(503, "not_configured", "WhatsApp updates aren't available yet.");
  await enforceRateLimit({ bucket: "wa-otp", limit: 5, windowSeconds: 3600 }, ctx.uid);
  const { phone } = await readJson(req, schema);
  const waId = toWaId(phone);
  if (!waId) throw new ApiError(400, "validation_failed", "Enter a valid WhatsApp number.");
  const code = newOtp();
  await adminDb().collection(C.users).doc(ctx.uid).update({
    whatsappPending: { waId, codeHash: sha256(`${ctx.uid}:${code}`), expiresAt: Timestamp.fromMillis(Date.now() + WA_LIMITS.otpTtlMinutes * 60_000), attempts: 0 },
    updatedAt: FieldValue.serverTimestamp(),
  });
  after(() => sendTemplate({ to: waId, template: TEMPLATES.otp, otpCode: code, purpose: "otp", uid: ctx.uid }).then(() => undefined));
  return json({ ok: true, expiresInMinutes: WA_LIMITS.otpTtlMinutes });
});
