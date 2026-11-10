import type { Query } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { ROLES } from "@/lib/config";
import { requireAdmin } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

const query = z.object({
  role: z.enum(ROLES).optional(),
  cursor: z.string().regex(/^[A-Za-z0-9]{1,128}$/).optional(),
});

export const GET = route(async (req) => {
  await requireAdmin(req);
  const q = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const db = adminDb();
  let ref: Query = db.collection(C.users);
  if (q.role) ref = ref.where("role", "==", q.role);
  ref = ref.orderBy("createdAt", "desc").limit(50);
  if (q.cursor) {
    const c = await db.collection(C.users).doc(q.cursor).get();
    if (c.exists) ref = ref.startAfter(c);
  }
  const snap = await ref.get();
  return json(serialize({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })), nextCursor: snap.size === 50 ? snap.docs[snap.size - 1]!.id : null }));
});
