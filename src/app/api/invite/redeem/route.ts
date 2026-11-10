import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { CREATOR_CATEGORIES, PROFESSIONAL_SKILLS, SCHEMA_VERSION, type Role } from "@/lib/config";
import { slugifyHandle } from "@/lib/ids";
import { redeemInviteSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireAuth } from "@/lib/server/auth";
import { C, profileCollection } from "@/lib/server/collections";
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

    const candidates = Array.from({ length: 4 }, () => slugifyHandle(name));
    const handleSnaps = await Promise.all(candidates.map((h) => tx.get(db.collection(C.handles).doc(h))));
    const idx = handleSnaps.findIndex((s) => !s.exists);
    if (idx === -1) throw new Error("Could not allocate handle");
    const handle = candidates[idx]!;

    // ── writes ──
    const now = FieldValue.serverTimestamp();
    tx.create(userRef, {
      uid: ctx.uid,
      role: inv.role,
      email: ctx.email,
      displayName: name,
      handle,
      status: "active",
      waitlistId: inv.waitlistId,
      marketingConsent: Boolean(w.marketingConsent),
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
    tx.create(db.collection(C.handles).doc(handle), { uid: ctx.uid, createdAt: now });

    const city = (w.city as string | undefined) ?? "";
    if (inv.role === "brand") {
      tx.create(db.collection(profileCollection("brand")).doc(ctx.uid), {
        uid: ctx.uid,
        displayName: name,
        handle,
        bio: "",
        city,
        industry: (w.category as string | undefined) ?? "Other",
        website: (w.link as string | undefined) ?? "",
        isPublic: false,
        verified: false,
        createdAt: now,
        updatedAt: now,
        schemaVersion: SCHEMA_VERSION,
      });
    } else {
      const cat = w.category as string | undefined;
      const valid = cat && ([...CREATOR_CATEGORIES, ...PROFESSIONAL_SKILLS] as readonly string[]).includes(cat);
      tx.create(db.collection(profileCollection(inv.role)).doc(ctx.uid), {
        uid: ctx.uid,
        kind: inv.role,
        displayName: name,
        handle,
        bio: "",
        city,
        categories: valid ? [cat] : [],
        languages: Array.isArray(w.languages) ? w.languages : [],
        portfolioLinks: w.link ? [w.link] : [],
        rateCardNote: "",
        openToPods: true,
        isPublic: false,
        verifiedPlatforms: [],
        createdAt: now,
        updatedAt: now,
        schemaVersion: SCHEMA_VERSION,
      });
    }
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
    return { role: inv.role, handle };
  });

  return json({ ok: true, ...result }, 201);
});
