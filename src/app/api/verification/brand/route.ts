import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { SCHEMA_VERSION } from "@/lib/config";
import { brandVerificationSchema } from "@/lib/schemas";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  const snap = await adminDb().collection(C.brandVerifications).doc(ctx.uid).get();
  return json(serialize({ verification: snap.exists ? snap.data() : null }));
});

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  if (ctx.user.role !== "brand") throw new ApiError(403, "wrong_role", "Business verification is for brand accounts.");
  await enforceRateLimit(RULES.verificationPerUser, ctx.uid);
  const input = await readJson(req, brandVerificationSchema);
  const db = adminDb();
  const ref = db.collection(C.brandVerifications).doc(ctx.uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const status = snap.exists ? (snap.get("status") as string) : null;
    if (status === "verified") throw new ApiError(409, "verified_locked", "Your business is verified. Contact support to change details.");
    if (status === "pending_review") throw new ApiError(409, "under_review", "Your details are already under review.");
    const now = FieldValue.serverTimestamp();
    tx.set(ref, {
      uid: ctx.uid,
      ...input,
      status: "pending_review",
      reviewNote: "",
      reviewedBy: null,
      reviewedAt: null,
      submittedAt: now,
      updatedAt: now,
      createdAt: snap.exists ? snap.get("createdAt") : now,
      schemaVersion: SCHEMA_VERSION,
    });
  });
  return json({ ok: true, status: "pending_review" }, 201);
});
