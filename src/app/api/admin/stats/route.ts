import { AggregateField, type Query } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { ROLES } from "@/lib/config";
import { requireAdmin } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";

export const runtime = "nodejs";

async function count(q: Query): Promise<number> {
  const agg = await q.count().get();
  return agg.data().count;
}

/** Real counts only. These numbers are for the founder, never shown publicly. */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const db = adminDb();
  const w = db.collection(C.waitlist);
  const [total, pending, invited, joined, cohort, members, socialPending, brandPending, openRequests, openCampaigns, deals, verifiedDeals, ...byRole] = await Promise.all([
    count(w),
    count(w.where("status", "==", "pending")),
    count(w.where("status", "==", "invited")),
    count(w.where("status", "==", "joined")),
    count(w.where("inCohortCity", "==", true)),
    count(db.collection(C.users)),
    count(db.collection(C.socialAccounts).where("status", "==", "pending_review")),
    count(db.collection(C.brandVerifications).where("status", "==", "pending_review")),
    count(db.collection(C.dataRequests).where("status", "==", "open")),
    count(db.collection(C.campaigns).where("status", "==", "open")),
    count(db.collection(C.deals)),
    count(db.collection(C.deals).where("verifiedCompletion", "==", true)),
    ...ROLES.map((r) => count(w.where("role", "==", r))),
  ]);
  const paid = db.collection(C.orders).where("status", "==", "paid");
  const [revAgg, activeGrowth, pilotsOpen] = await Promise.all([
    paid.aggregate({ total: AggregateField.sum("amountPaise"), orders: AggregateField.count() }).get(),
    count(db.collection(C.subscriptions).where("expiresAt", ">", new Date())),
    count(db.collection(C.managedRequests).where("status", "==", "new")),
  ]);
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rev30 = await paid.where("paidAt", ">=", since).aggregate({ total: AggregateField.sum("amountPaise") }).get();
  const wa30 = await count(db.collection(C.whatsappMessages).where("createdAt", ">=", since));
  return json({
    revenue: {
      totalPaise: revAgg.data().total ?? 0,
      last30Paise: rev30.data().total ?? 0,
      paidOrders: revAgg.data().orders,
      activeGrowth,
      pilotsOpen,
    },
    waitlist: { total, pending, invited, joined, inCohortCity: cohort, byRole: Object.fromEntries(ROLES.map((r, i) => [r, byRole[i] ?? 0])) },
    members,
    activity: { openCampaigns, deals, verifiedDeals, whatsapp30: wa30 },
    queues: { socialPending, brandPending, openRequests },
    generatedAt: new Date().toISOString(),
  });
});
