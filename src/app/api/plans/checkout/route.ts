import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { site } from "@/lib/config";
import { PRODUCTS } from "@/lib/plans";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { createOrder, publicKeyId } from "@/lib/server/razorpay";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const schema = z.object({ productId: z.enum(["growth_monthly", "growth_yearly", "managed_pilot"]) });

/** Creates a Razorpay order for a server-priced product. The client never sends an amount. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  if (ctx.user.role !== "brand") throw new ApiError(403, "wrong_role", "Plans are for brand accounts. Creators use CreatorsAI free.");
  await enforceRateLimit({ bucket: "checkout-user", limit: 20, windowSeconds: 3600 }, ctx.uid);
  const { productId } = await readJson(req, schema);
  const product = PRODUCTS[productId];
  const db = adminDb();
  const internalId = db.collection(C.orders).doc().id;

  const order = await createOrder({
    amountPaise: product.amountPaise,
    receipt: internalId.slice(0, 40),
    notes: { uid: ctx.uid, productId, app: "creatorsai" },
  });
  if (order.amount !== product.amountPaise || order.currency !== "INR") throw new ApiError(502, "payment_error", "Payment provider returned an unexpected order.");

  await db.collection(C.orders).doc(order.id).create({
    uid: ctx.uid,
    productId,
    amountPaise: product.amountPaise,
    currency: "INR",
    status: "created",
    receiptNo: null,
    paymentId: null,
    paidVia: null,
    internalRef: internalId,
    buyer: { name: ctx.user.displayName, email: ctx.email ?? "" },
    createdAt: FieldValue.serverTimestamp(),
    paidAt: null,
  });

  return json({
    keyId: publicKeyId(),
    orderId: order.id,
    amount: product.amountPaise,
    currency: "INR",
    name: site.name,
    description: product.name,
    prefill: { name: ctx.user.displayName, email: ctx.email ?? "" },
  });
});
