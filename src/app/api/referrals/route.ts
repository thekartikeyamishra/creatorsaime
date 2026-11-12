import { adminDb } from "@/lib/firebase/admin";
import { site } from "@/lib/config";
import { ambassadorLevel, REFERRAL } from "@/lib/referrals";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";
import { getOrCreateRefCode } from "@/lib/server/referrals";

export const runtime = "nodejs";

/** The member's share link, progress and the people they invited (first names only). */
export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  const db = adminDb();
  const code = await getOrCreateRefCode(ctx.uid);
  const [stats, list] = await Promise.all([
    db.collection(C.referralStats).doc(ctx.uid).get(),
    db.collection(C.referrals).where("referrerUid", "==", ctx.uid).orderBy("createdAt", "desc").limit(50).get().catch(() => null),
  ]);
  const uids = (list?.docs ?? []).map((d) => d.id);
  const users = uids.length ? await db.getAll(...uids.map((u) => db.collection(C.users).doc(u))) : [];
  const nameOf = new Map(users.map((u) => [u.id, String(u.get("displayName") ?? "Member").split(" ")[0]]));
  const qualified = stats.exists ? Number(stats.get("qualified")) || 0 : 0;
  const year = new Date().getUTCFullYear();
  return json({
    code,
    link: `${site.url}/r/${code}`,
    role: ctx.user.role,
    stats: {
      joined: stats.exists ? Number(stats.get("joined")) || 0 : 0,
      qualified,
      growthDaysEarned: stats.exists ? Number(stats.get("growthDaysEarned")) || 0 : 0,
      rewardsLeftThisYear: REFERRAL.maxRewardsPerYear - (stats.get("rewardYear") === year ? Number(stats.get("rewardsThisYear")) || 0 : 0),
    },
    ambassador: ambassadorLevel(qualified),
    referrals: (list?.docs ?? []).map((d) => ({
      name: nameOf.get(d.id) ?? "Member",
      role: d.get("referredRole"),
      status: d.get("status"),
      rewarded: Boolean(d.get("rewarded")),
      joinedAt: d.get("createdAt")?.toDate?.().toISOString() ?? null,
    })),
    rules: REFERRAL,
  });
});
