import { adminDb } from "@/lib/firebase/admin";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

/** Creator: my applications. */
export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  const snap = await adminDb().collection(C.applications).where("creatorUid", "==", ctx.uid).orderBy("createdAt", "desc").limit(200).get();
  return json(serialize({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }));
});
