import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { SCHEMA_VERSION } from "@/lib/config";
import { adminVerificationActionSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";

export const runtime = "nodejs";

/**
 * Human-in-the-loop verification. A person checks the evidence (code in bio, business documents)
 * and records the decision. Every decision creates an evidence-backed trust signal and an audit entry.
 */
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const admin = await requireAdmin(req);
  const { id } = await params;
  if (!/^[A-Za-z0-9]{1,128}$/.test(id)) throw new ApiError(400, "bad_id", "Invalid id");
  const { kind, action, note } = await readJson(req, adminVerificationActionSchema);
  if (action === "reject" && !note) throw new ApiError(400, "note_required", "Add a short reason so the user knows what to fix.");

  const db = adminDb();
  const ref = db.collection(kind === "social" ? C.socialAccounts : C.brandVerifications).doc(id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "not_found", "Not found");
    const d = snap.data()!;
    if (d.status !== "pending_review") throw new ApiError(409, "invalid_state", "Only items pending review can be decided.");
    const uid = d.uid as string;
    const now = FieldValue.serverTimestamp();
    const status = action === "verify" ? "verified" : "rejected";

    // Read before writes.
    const profileRef = db.collection(kind === "social" ? C.creatorProfiles : C.brandProfiles).doc(uid);
    const profile = await tx.get(profileRef);

    tx.update(ref, { status, reviewNote: note, reviewedBy: admin.uid, reviewedAt: now, updatedAt: now });

    if (action === "verify") {
      if (kind === "social" && profile.exists) {
        tx.update(profileRef, { verifiedPlatforms: FieldValue.arrayUnion(d.platform as string), updatedAt: now });
      }
      if (kind === "brand" && profile.exists) {
        tx.update(profileRef, { verified: true, updatedAt: now });
      }
      tx.create(db.collection(C.trustSignals).doc(), {
        uid,
        type: kind === "social" ? "social_ownership_verified" : "business_verified",
        detail: kind === "social" ? { platform: d.platform, handle: d.handle, url: d.url } : { legalName: d.legalName },
        evidence: kind === "social" ? "verification_code_in_bio_manual_review" : "business_details_manual_review",
        public: true,
        reviewedBy: admin.uid,
        at: now,
        schemaVersion: SCHEMA_VERSION,
      });
    }
    auditIn(tx, {
      actorUid: admin.uid,
      actorRole: "admin",
      action: `verification.${kind}.${status}`,
      targetType: kind === "social" ? "socialAccount" : "brandVerification",
      targetId: id,
      meta: { uid },
    });
  });

  return json({ ok: true });
});
