import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  await requireAdmin(req);
  const snap = await adminDb().collection(C.dataRequests).where("status", "==", "open").orderBy("createdAt", "asc").limit(100).get();
  return json(serialize({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }));
});
