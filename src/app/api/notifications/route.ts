import { adminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const ctx = await requireAuth(req);
  const db = adminDb();
  const [list, unread] = await Promise.all([
    db.collection(C.notifications).where("uid", "==", ctx.uid).orderBy("createdAt", "desc").limit(30).get(),
    db.collection(C.notifications).where("uid", "==", ctx.uid).where("read", "==", false).count().get(),
  ]);
  return json(serialize({ items: list.docs.map((d) => ({ id: d.id, ...d.data() })), unread: unread.data().count }));
});
