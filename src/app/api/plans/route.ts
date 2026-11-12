import { adminDb } from "@/lib/firebase/admin";
import { LIMITS_BY_TIER, PRODUCTS } from "@/lib/plans";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";
import { getTier } from "@/lib/server/plans";
import { razorpayConfigured } from "@/lib/server/razorpay";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  const { tier, expiresAt, trial } = await getTier(ctx.uid);
  const orders = await adminDb().collection(C.orders).where("uid", "==", ctx.uid).where("status", "==", "paid").orderBy("createdAt", "desc").limit(50).get();
  return json(
    serialize({
      tier,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      trial: tier === "growth" && trial,
      limits: LIMITS_BY_TIER[tier],
      products: Object.values(PRODUCTS),
      paymentsEnabled: razorpayConfigured(),
      orders: orders.docs.map((d) => ({ id: d.id, productId: d.get("productId"), amountPaise: d.get("amountPaise"), receiptNo: d.get("receiptNo"), paidAt: d.get("paidAt") })),
    }),
  );
});
