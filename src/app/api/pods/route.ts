import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { SCHEMA_VERSION } from "@/lib/config";
import { POD_LIMITS } from "@/lib/pods";
import { podDetailsSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

/** Pods I lead, belong to, or am invited to. */
export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  const snap = await adminDb().collection(C.pods).where("memberUids", "array-contains", ctx.uid).limit(50).get();
  return json(serialize({ items: snap.docs.filter((d) => d.get("status") !== "archived").map((d) => ({ id: d.id, ...d.data() })) }));
});

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  if (ctx.user.role === "brand") throw new ApiError(403, "wrong_role", "Pods are teams of creators and creative professionals.");
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const details = await readJson(req, podDetailsSchema);
  const db = adminDb();
  const led = await db.collection(C.pods).where("leadUid", "==", ctx.uid).where("status", "==", "active").count().get();
  if (led.data().count >= POD_LIMITS.maxPodsLed) throw new ApiError(400, "limit_reached", `You can lead up to ${POD_LIMITS.maxPodsLed} pods.`);
  const ref = db.collection(C.pods).doc();
  const lead = { uid: ctx.uid, displayName: ctx.user.displayName, handle: ctx.user.handle, role: "Lead creator", sharePct: 100, status: "active" as const };
  const batch = db.batch();
  batch.create(ref, {
    ...details,
    leadUid: ctx.uid,
    members: [lead],
    memberUids: [ctx.uid],
    activeUids: [ctx.uid],
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
  });
  auditIn(batch, { actorUid: ctx.uid, actorRole: "user", action: "pod.created", targetType: "pod", targetId: ref.id });
  await batch.commit();
  return json({ id: ref.id }, 201);
});
