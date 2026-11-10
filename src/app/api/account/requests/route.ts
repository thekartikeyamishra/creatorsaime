import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { SCHEMA_VERSION } from "@/lib/config";
import { dataRequestSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireAuth } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const ctx = await requireAuth(req);
  const snap = await adminDb().collection(C.dataRequests).where("uid", "==", ctx.uid).limit(50).get();
  return json(serialize({ requests: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }));
});

/**
 * Deletion, correction and grievance requests are logged and handled by a human
 * (financial/audit records may have statutory retention). Never auto-processed.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireAuth(req);
  await enforceRateLimit(RULES.dataRequestPerUser, ctx.uid);
  const input = await readJson(req, dataRequestSchema);
  const db = adminDb();
  const ref = db.collection(C.dataRequests).doc();
  const batch = db.batch();
  batch.create(ref, {
    uid: ctx.uid,
    email: ctx.email,
    type: input.type,
    details: input.details,
    status: "open",
    resolutionNote: "",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
  });
  auditIn(batch, { actorUid: ctx.uid, actorRole: "user", action: `data_request.${input.type}`, targetType: "dataRequest", targetId: ref.id });
  await batch.commit();
  return json({ ok: true, id: ref.id }, 201);
});
