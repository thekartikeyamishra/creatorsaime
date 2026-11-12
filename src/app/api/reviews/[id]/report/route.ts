import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { auditIn } from "@/lib/server/audit";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
const schema = z.object({ reason: z.enum(["false_information", "abusive", "not_my_deal", "other"]), note: z.string().trim().max(300).optional().default("") });

/** The reviewed member can flag a review for admin moderation. Reviews are never auto-removed. */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const { id } = await params;
  const input = await readJson(req, schema);
  const db = adminDb();
  await db.runTransaction(async (tx) => {
    const ref = db.collection(C.reviews).doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get("subjectUid") !== ctx.uid) throw new ApiError(404, "not_found", "Review not found.");
    tx.update(ref, { reported: true, report: { reason: input.reason, note: input.note, at: FieldValue.serverTimestamp() } });
    auditIn(tx, { actorUid: ctx.uid, actorRole: "user", action: "review.reported", targetType: "review", targetId: id, meta: { reason: input.reason } });
  });
  return json({ ok: true });
});
