import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { POLICY_VERSION, SCHEMA_VERSION } from "@/lib/config";
import { generateReferralCode } from "@/lib/ids";
import { buildPreview } from "@/lib/readiness";
import { waitlistSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { C } from "@/lib/server/collections";
import { keyedHash } from "@/lib/server/crypto";
import { assertSameOrigin, clientIp, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const input = await readJson(req, waitlistSchema);
  const preview = buildPreview(input);

  // Honeypot tripped: respond like a success, store nothing.
  if (input.company_fax) {
    return json({ status: "created", referralCode: null, preview });
  }

  await enforceRateLimit(RULES.waitlistPerIp, clientIp(req));

  const db = adminDb();
  const emailHash = keyedHash(input.email);
  const entryRef = db.collection(C.waitlist).doc(emailHash);
  const candidates = Array.from({ length: 4 }, generateReferralCode);

  const result = await db.runTransaction(async (tx) => {
    // ── reads (all before writes) ──
    const existing = await tx.get(entryRef);
    if (existing.exists) return { status: "already_registered" as const };

    let referrerId: string | null = null;
    if (input.ref) {
      const refSnap = await tx.get(db.collection(C.referralCodes).doc(input.ref));
      const id = refSnap.exists ? (refSnap.get("waitlistId") as string) : null;
      if (id && id !== emailHash) {
        const referrer = await tx.get(db.collection(C.waitlist).doc(id));
        if (referrer.exists) referrerId = id;
      }
    }

    const codeSnaps = await Promise.all(candidates.map((c) => tx.get(db.collection(C.referralCodes).doc(c))));
    const freeIndex = codeSnaps.findIndex((s) => !s.exists);
    if (freeIndex === -1) throw new Error("Could not allocate referral code");
    const referralCode = candidates[freeIndex]!;

    // ── writes ──
    const now = FieldValue.serverTimestamp();
    tx.create(entryRef, {
      name: input.name,
      email: input.email,
      city: input.city,
      role: input.role,
      category: input.category,
      objective: input.objective ?? null,
      link: input.link,
      languages: input.languages,
      challenges: input.challenges,
      wants: input.wants,
      referralSource: input.referralSource ?? null,
      referralCode,
      referredBy: referrerId,
      referralsTotal: 0,
      referralsQualified: 0,
      status: "pending",
      marketingConsent: input.marketingConsent,
      inCohortCity: preview.inCohortCity,
      uid: null,
      inviteHash: null,
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
    tx.create(db.collection(C.referralCodes).doc(referralCode), { waitlistId: emailHash, createdAt: now });
    if (referrerId) {
      tx.update(db.collection(C.waitlist).doc(referrerId), {
        referralsTotal: FieldValue.increment(1),
        updatedAt: now,
      });
    }
    const consentBase = { subjectType: "waitlist", subjectId: emailHash, uid: null, policyVersion: POLICY_VERSION, source: "waitlist_form", at: Timestamp.now() };
    tx.create(db.collection(C.consentRecords).doc(), { ...consentBase, purpose: "terms_and_privacy", granted: true });
    tx.create(db.collection(C.consentRecords).doc(), { ...consentBase, purpose: "marketing", granted: input.marketingConsent });
    auditIn(tx, {
      actorUid: null,
      actorRole: "public",
      action: "waitlist.joined",
      targetType: "waitlist",
      targetId: emailHash,
      meta: { role: input.role, referred: Boolean(referrerId) },
    });
    return { status: "created" as const, referralCode };
  });

  if (result.status === "already_registered") {
    return json({ status: "already_registered", referralCode: null, preview }, 200);
  }
  return json({ status: "created", referralCode: result.referralCode, preview }, 201);
});
