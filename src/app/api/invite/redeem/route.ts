import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { Role } from "@/lib/config";
import { redeemInviteSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireAuth } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { createMemberInTx } from "@/lib/server/members";
import { clearRefCookie, readAttribution, refCodeFromRequest, writeAttribution } from "@/lib/server/referrals";
import { sha256 } from "@/lib/server/crypto";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireAuth(req);
  if (!ctx.email) throw new ApiError(400, "email_required", "Your account has no email address.");
  if (!ctx.emailVerified) throw new ApiError(403, "email_unverified", "Please verify your email address first.");
  await enforceRateLimit(RULES.redeemPerUser, ctx.uid);

  const { code } = await readJson(req, redeemInviteSchema);
  const db = adminDb();
  const inviteRef = db.collection(C.invites).doc(sha256(code));
  const userRef = db.collection(C.users).doc(ctx.uid);

  const refCode = refCodeFromRequest(req);
  const result = await db.runTransaction(async (tx) => {
    const [invite, existingUser] = await Promise.all([tx.get(inviteRef), tx.get(userRef)]);
    if (existingUser.exists) throw new ApiError(409, "already_member", "This account is already a member.");
    if (!invite.exists) throw new ApiError(404, "invalid_invite", "This invite link is not valid.");

    const inv = invite.data() as {
      waitlistId: string;
      email: string;
      role: Role;
      status: string;
      expiresAt: Timestamp;
    };
    if (inv.status !== "active") throw new ApiError(410, "invite_used", "This invite has already been used or was revoked.");
    if (inv.expiresAt.toMillis() < Date.now()) throw new ApiError(410, "invite_expired", "This invite has expired. Ask us for a new one.");
    if (inv.email.toLowerCase() !== ctx.email!.toLowerCase()) {
      throw new ApiError(403, "invite_email_mismatch", "This invite was issued to a different email address. Sign in with that email.");
    }

    const waitlistRef = db.collection(C.waitlist).doc(inv.waitlistId);
    const waitlist = await tx.get(waitlistRef);
    const w = waitlist.exists ? waitlist.data()! : {};
    const name = (w.name as string | undefined) || ctx.token.name || ctx.email!.split("@")[0]!;

    const city = (w.city as string | undefined) ?? "";
    const attribution = await readAttribution(tx, db, refCode, ctx.uid, inv.role);
    const { handle } = await createMemberInTx(tx, db, {
      uid: ctx.uid,
      email: ctx.email!,
      name,
      role: inv.role,
      city,
      category: w.category as string | undefined,
      link: w.link as string | undefined,
      languages: Array.isArray(w.languages) ? (w.languages as string[]) : [],
      marketingConsent: Boolean(w.marketingConsent),
      waitlistId: inv.waitlistId,
      joinedVia: "invite",
    });
    const now = FieldValue.serverTimestamp();
    tx.update(inviteRef, { status: "redeemed", redeemedBy: ctx.uid, redeemedAt: now });
    if (waitlist.exists) tx.update(waitlistRef, { status: "joined", uid: ctx.uid, updatedAt: now });
    auditIn(tx, {
      actorUid: ctx.uid,
      actorRole: "user",
      action: "invite.redeemed",
      targetType: "user",
      targetId: ctx.uid,
      meta: { role: inv.role },
    });
    writeAttribution(tx, db, attribution, ctx.uid, inv.role, name);
    return { role: inv.role, handle };
  });

  return json({ ok: true, ...result }, { status: 201, headers: refCode ? { "Set-Cookie": clearRefCookie } : undefined });
});
