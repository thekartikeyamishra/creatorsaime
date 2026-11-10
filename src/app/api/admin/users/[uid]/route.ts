import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { adminUserActionSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";

export const runtime = "nodejs";

/** Suspension is always a human decision with a recorded reason — never automated. */
export const PATCH = route<{ params: Promise<{ uid: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const admin = await requireAdmin(req);
  const { uid } = await params;
  if (!/^[A-Za-z0-9]{1,128}$/.test(uid)) throw new ApiError(400, "bad_id", "Invalid id");
  if (uid === admin.uid) throw new ApiError(400, "self_action", "You cannot change your own account status.");
  const { action, reason } = await readJson(req, adminUserActionSchema);
  const db = adminDb();
  const ref = db.collection(C.users).doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new ApiError(404, "not_found", "User not found");

  const status = action === "suspend" ? "suspended" : "active";
  const batch = db.batch();
  batch.update(ref, { status, statusReason: reason, statusChangedBy: admin.uid, updatedAt: FieldValue.serverTimestamp() });
  auditIn(batch, { actorUid: admin.uid, actorRole: "admin", action: `user.${status}`, targetType: "user", targetId: uid });
  await batch.commit();

  if (action === "suspend") {
    await adminAuth().revokeRefreshTokens(uid);
  }
  return json({ ok: true, status });
});
