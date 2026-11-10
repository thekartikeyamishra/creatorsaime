import { z } from "zod";
import type { Query } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { ROLES } from "@/lib/config";
import { requireAdmin } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

const query = z.object({
  status: z.enum(["pending", "invited", "joined", "rejected"]).optional(),
  role: z.enum(ROLES).optional(),
  cursor: z.string().regex(/^[a-f0-9]{64}$/).optional(),
});

export const GET = route(async (req) => {
  await requireAdmin(req);
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const q = query.parse(params);
  const db = adminDb();
  let ref: Query = db.collection(C.waitlist);
  if (q.status) ref = ref.where("status", "==", q.status);
  if (q.role) ref = ref.where("role", "==", q.role);
  ref = ref.orderBy("createdAt", "desc").limit(50);
  if (q.cursor) {
    const c = await db.collection(C.waitlist).doc(q.cursor).get();
    if (c.exists) ref = ref.startAfter(c);
  }
  const snap = await ref.get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return json(serialize({ items, nextCursor: snap.size === 50 ? snap.docs[snap.size - 1]!.id : null }));
});
