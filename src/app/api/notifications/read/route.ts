import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireAuth } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { assertSameOrigin, json, readJson, route } from "@/lib/server/http";

export const runtime = "nodejs";

const schema = z.object({ ids: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,160}$/)).max(50).optional(), all: z.boolean().optional() });

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireAuth(req);
  const { ids, all } = await readJson(req, schema);
  const db = adminDb();
  const col = db.collection(C.notifications);
  const docs = all
    ? (await col.where("uid", "==", ctx.uid).where("read", "==", false).limit(200).get()).docs
    : (await Promise.all((ids ?? []).map((id) => col.doc(id).get()))).filter((d) => d.exists && d.get("uid") === ctx.uid);
  const batch = db.batch();
  for (const d of docs) batch.update(d.ref, { read: true });
  if (docs.length) await batch.commit();
  return json({ ok: true, updated: docs.length });
});
