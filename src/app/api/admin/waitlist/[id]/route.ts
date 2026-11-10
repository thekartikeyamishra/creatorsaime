import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { site } from "@/lib/config";
import { generateInviteCode } from "@/lib/ids";
import { adminWaitlistActionSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { sha256 } from "@/lib/server/crypto";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";

export const runtime = "nodejs";
const INVITE_TTL_DAYS = 14;

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const admin = await requireAdmin(req);
  const { id } = await params;
  if (!/^[a-f0-9]{64}$/.test(id)) throw new ApiError(400, "bad_id", "Invalid id");
  const { action, note } = await readJson(req, adminWaitlistActionSchema);
  const db = adminDb();
  const ref = db.collection(C.waitlist).doc(id);
  const code = action === "approve" ? generateInviteCode() : null;

  const out = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "not_found", "Entry not found");
    const entry = snap.data()!;
    if (entry.status === "joined") throw new ApiError(409, "already_joined", "This person has already joined.");
    const oldInviteRef = entry.inviteHash ? db.collection(C.invites).doc(entry.inviteHash as string) : null;
    const referrerRef = entry.referredBy ? db.collection(C.waitlist).doc(entry.referredBy as string) : null;
    const referrer = referrerRef ? await tx.get(referrerRef) : null;

    const now = FieldValue.serverTimestamp();
    const base = { actorUid: admin.uid, actorRole: "admin" as const, targetType: "waitlist", targetId: id };

    if (action === "approve") {
      if (oldInviteRef) tx.update(oldInviteRef, { status: "revoked", revokedAt: now });
      const hash = sha256(code!);
      tx.create(db.collection(C.invites).doc(hash), {
        waitlistId: id,
        email: entry.email,
        role: entry.role,
        status: "active",
        expiresAt: Timestamp.fromMillis(Date.now() + INVITE_TTL_DAYS * 86_400_000),
        createdBy: admin.uid,
        createdAt: now,
        redeemedBy: null,
        redeemedAt: null,
      });
      // A referral counts as "qualified" only the first time the referred person is approved.
      const qualifies = Boolean(referrerRef && referrer?.exists && !entry.referralQualified);
      if (qualifies) tx.update(referrerRef!, { referralsQualified: FieldValue.increment(1), updatedAt: now });
      tx.update(ref, {
        status: "invited",
        inviteHash: hash,
        reviewNote: note,
        reviewedBy: admin.uid,
        reviewedAt: now,
        updatedAt: now,
        ...(qualifies ? { referralQualified: true } : {}),
      });
      auditIn(tx, { ...base, action: "waitlist.approved", meta: { role: entry.role as string, reissued: Boolean(oldInviteRef) } });
      return { status: "invited", email: entry.email as string };
    }

    if (action === "reject") {
      if (oldInviteRef) tx.update(oldInviteRef, { status: "revoked", revokedAt: now });
      tx.update(ref, { status: "rejected", inviteHash: null, reviewNote: note, reviewedBy: admin.uid, reviewedAt: now, updatedAt: now });
      auditIn(tx, { ...base, action: "waitlist.rejected" });
      return { status: "rejected", email: entry.email as string };
    }

    // revoke_invite
    if (!oldInviteRef) throw new ApiError(409, "no_invite", "There is no active invite to revoke.");
    tx.update(oldInviteRef, { status: "revoked", revokedAt: now });
    tx.update(ref, { status: "pending", inviteHash: null, updatedAt: now });
    auditIn(tx, { ...base, action: "waitlist.invite_revoked" });
    return { status: "pending", email: entry.email as string };
  });

  // The raw code is returned exactly once, to the admin, and never stored.
  const inviteUrl = code ? `${site.url}/signup?invite=${encodeURIComponent(code)}` : null;
  return json({ ok: true, ...out, inviteUrl, expiresInDays: code ? INVITE_TTL_DAYS : null });
});
