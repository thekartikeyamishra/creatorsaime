import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { auditIn } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";

export const runtime = "nodejs";
const schema = z.object({ action: z.enum(["hide", "restore", "dismiss_report"]) });

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const admin = await requireAdmin(req);
  const { id } = await params;
  const { action } = await readJson(req, schema);
  const db = adminDb();
  await db.runTransaction(async (tx) => {
    const ref = db.collection(C.reviews).doc(id);
    if (!(await tx.get(ref)).exists) throw new ApiError(404, "not_found", "Review not found.");
    const patch = action === "hide" ? { hidden: true, reported: false } : action === "restore" ? { hidden: false } : { reported: false };
    tx.update(ref, { ...patch, moderatedAt: FieldValue.serverTimestamp(), moderatedBy: admin.uid });
    auditIn(tx, { actorUid: admin.uid, actorRole: "admin", action: `review.${action}`, targetType: "review", targetId: id });
  });
  return json({ ok: true });
});
