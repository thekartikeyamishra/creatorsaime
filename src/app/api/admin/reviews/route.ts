import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

/** Moderation queue: reported reviews first, then the latest. */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const db = adminDb();
  const [reported, latest] = await Promise.all([
    db.collection(C.reviews).where("reported", "==", true).orderBy("createdAt", "desc").limit(50).get(),
    db.collection(C.reviews).orderBy("createdAt", "desc").limit(50).get(),
  ]);
  const map = (d: FirebaseFirestore.QueryDocumentSnapshot) => serialize({ id: d.id, ...d.data() });
  return json({ reported: reported.docs.map(map), latest: latest.docs.map(map) });
});
