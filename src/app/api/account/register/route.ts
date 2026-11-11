import { adminDb } from "@/lib/firebase/admin";
import { registerSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireAuth } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, clientIp, json, readJson, route } from "@/lib/server/http";
import { createMemberInTx, recordConsentInTx } from "@/lib/server/members";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

/**
 * Open sign-up. Creates a free account for a signed-in user with a VERIFIED email (Google accounts are
 * verified; email/password accounts must click the verification link first). Rate-limited per IP and
 * per user. Joining is free; trust in the network comes from social/brand verification and confirmed deals.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireAuth(req);
  if (!ctx.email) throw new ApiError(400, "email_required", "Your account has no email address.");
  if (!ctx.emailVerified) throw new ApiError(403, "email_unverified", "Please verify your email address first — check your inbox for the link.");
  await enforceRateLimit(RULES.registerPerIp, clientIp(req));
  await enforceRateLimit(RULES.redeemPerUser, ctx.uid);

  const input = await readJson(req, registerSchema);
  const db = adminDb();
  const userRef = db.collection(C.users).doc(ctx.uid);

  const result = await db.runTransaction(async (tx) => {
    const existing = await tx.get(userRef);
    if (existing.exists) throw new ApiError(409, "already_member", "This account is already set up.");
    const { handle } = await createMemberInTx(tx, db, {
      uid: ctx.uid,
      email: ctx.email!,
      name: input.name,
      role: input.role,
      city: input.city,
      category: input.category,
      marketingConsent: input.marketingConsent,
      waitlistId: null,
      joinedVia: "open",
    });
    recordConsentInTx(tx, db, ctx.uid, input.marketingConsent, "signup_form");
    auditIn(tx, { actorUid: ctx.uid, actorRole: "user", action: "account.registered", targetType: "user", targetId: ctx.uid, meta: { role: input.role } });
    return { role: input.role, handle };
  });
  return json({ ok: true, ...result }, 201);
});
