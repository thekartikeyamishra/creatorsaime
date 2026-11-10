import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { CREATOR_CATEGORIES, DELIVERABLE_TYPES } from "@/lib/config";
import { benchmarkKey, K_MIN_CREATORS, K_MIN_DEALS, type Benchmark } from "@/lib/insights";
import { LIMITS_BY_TIER } from "@/lib/plans";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";
import { getTier } from "@/lib/server/plans";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

const query = z.object({
  category: z.enum(CREATOR_CATEGORIES),
  type: z.enum(DELIVERABLE_TYPES),
  city: z.string().trim().max(60).optional().default(""),
});

/**
 * Rate & Results Index lookup.
 * - Creators: full fee ranges (city + national) free — it helps them price fairly and earn more.
 * - Brands on Free: national median only. Brands on Growth: city-level ranges + cost per customer.
 */
export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  const q = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const db = adminDb();
  const id = (k: string) => Buffer.from(k).toString("base64url").slice(0, 400);
  const [citySnap, allSnap] = await Promise.all([
    q.city ? db.collection(C.benchmarks).doc(id(benchmarkKey(q.city, q.category, q.type))).get() : null,
    db.collection(C.benchmarks).doc(id(benchmarkKey("", q.category, q.type))).get(),
  ]);
  const city = citySnap?.exists ? (citySnap.data() as Benchmark) : null;
  const national = allSnap.exists ? (allSnap.data() as Benchmark) : null;

  const isBrand = ctx.user.role === "brand";
  const full = !isBrand || LIMITS_BY_TIER[(await getTier(ctx.uid)).tier].fullRateIndex;
  const redact = (b: Benchmark | null) => {
    if (!b) return null;
    if (full) return b;
    return { ...b, feeP25: null, feeP75: null, cpcMedian: null };
  };
  return json(
    serialize({
      city: full ? city : null,
      national: redact(national),
      locked: !full,
      cityAvailableButLocked: !full && Boolean(city),
      thresholds: { minDeals: K_MIN_DEALS, minCreators: K_MIN_CREATORS },
    }),
  );
});
