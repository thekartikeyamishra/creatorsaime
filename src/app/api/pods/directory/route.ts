import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { normCity } from "@/lib/insights";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";
import type { PodDoc } from "@/lib/server/pods";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

const query = z.object({ city: z.string().trim().max(60).optional().default("") });

/** Public, active pods with 2+ active members — for brands (and creators looking for collaborators). */
export const GET = route(async (req) => {
  await requireMember(req);
  const { city } = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const snap = await adminDb().collection(C.pods).where("isPublic", "==", true).where("status", "==", "active").orderBy("updatedAt", "desc").limit(200).get();
  const items = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as PodDoc) }))
    .filter((p) => p.activeUids.length >= 2 && (!city || normCity(p.city) === normCity(city)))
    .map((p) => ({
      id: p.id,
      name: p.name,
      city: p.city,
      description: p.description,
      categories: p.categories,
      members: p.members.filter((m) => m.status === "active").map((m) => ({ displayName: m.displayName, handle: m.handle, role: m.role })),
    }));
  return json(serialize({ items }));
});
