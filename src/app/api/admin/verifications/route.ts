import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

const query = z.object({
  kind: z.enum(["social", "brand"]).default("social"),
  status: z.enum(["pending_review", "verified", "rejected"]).default("pending_review"),
});

export const GET = route(async (req) => {
  await requireAdmin(req);
  const q = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const col = q.kind === "social" ? C.socialAccounts : C.brandVerifications;
  const snap = await adminDb().collection(col).where("status", "==", q.status).orderBy("updatedAt", "asc").limit(100).get();
  return json(serialize({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }));
});
