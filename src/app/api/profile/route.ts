import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { brandProfileSchema, creatorProfileSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireMember } from "@/lib/server/auth";
import { C, profileCollection } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  const snap = await adminDb().collection(profileCollection(ctx.user.role)).doc(ctx.uid).get();
  return json(serialize({ role: ctx.user.role, profile: snap.exists ? snap.data() : null }));
});

export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const role = ctx.user.role;
  const data = role === "brand" ? await readJson(req, brandProfileSchema) : await readJson(req, creatorProfileSchema);

  const db = adminDb();
  const profileRef = db.collection(profileCollection(role)).doc(ctx.uid);
  const userRef = db.collection(C.users).doc(ctx.uid);

  await db.runTransaction(async (tx) => {
    const [profile, user] = await Promise.all([tx.get(profileRef), tx.get(userRef)]);
    if (!profile.exists || !user.exists) throw new ApiError(404, "profile_missing", "Profile not found");
    const oldHandle = user.get("handle") as string;
    const handleChanged = data.handle !== oldHandle;
    if (handleChanged) {
      const target = await tx.get(db.collection(C.handles).doc(data.handle));
      if (target.exists && target.get("uid") !== ctx.uid) {
        throw new ApiError(409, "handle_taken", "That handle is taken. Try another.");
      }
    }
    const now = FieldValue.serverTimestamp();
    // Only whitelisted, validated fields are written. Server-owned fields (verified, verifiedPlatforms) are never client-settable.
    tx.update(profileRef, { ...data, updatedAt: now });
    tx.update(userRef, { displayName: data.displayName, handle: data.handle, updatedAt: now });
    if (handleChanged) {
      tx.set(db.collection(C.handles).doc(data.handle), { uid: ctx.uid, createdAt: now });
      tx.delete(db.collection(C.handles).doc(oldHandle));
      auditIn(tx, { actorUid: ctx.uid, actorRole: "user", action: "profile.handle_changed", targetType: "user", targetId: ctx.uid, meta: { from: oldHandle, to: data.handle } });
    }
  });

  return json({ ok: true });
});
