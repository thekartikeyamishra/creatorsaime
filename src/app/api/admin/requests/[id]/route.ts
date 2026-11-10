import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { cleanText } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";

export const runtime = "nodejs";

const schema = z.object({ resolutionNote: z.string().transform(cleanText).pipe(z.string().min(5).max(1000)) });

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const admin = await requireAdmin(req);
  const { id } = await params;
  if (!/^[A-Za-z0-9]{1,128}$/.test(id)) throw new ApiError(400, "bad_id", "Invalid id");
  const { resolutionNote } = await readJson(req, schema);
  const db = adminDb();
  const ref = db.collection(C.dataRequests).doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError(404, "not_found", "Not found");
    if (snap.get("status") !== "open") throw new ApiError(409, "invalid_state", "Already resolved");
    tx.update(ref, { status: "resolved", resolutionNote, resolvedBy: admin.uid, updatedAt: FieldValue.serverTimestamp() });
    auditIn(tx, { actorUid: admin.uid, actorRole: "admin", action: "data_request.resolved", targetType: "dataRequest", targetId: id });
  });
  return json({ ok: true });
});
