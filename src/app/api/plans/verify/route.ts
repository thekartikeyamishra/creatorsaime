import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { fulfillOrder } from "@/lib/server/plans";
import { verifyCheckoutSignature } from "@/lib/server/razorpay";

export const runtime = "nodejs";

const schema = z.object({
  razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]{6,40}$/),
  razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]{6,40}$/),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
});

/** Called by the Checkout success handler. The webhook is the backstop if this never arrives. */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  const body = await readJson(req, schema);
  const order = await adminDb().collection(C.orders).doc(body.razorpay_order_id).get();
  if (!order.exists || order.get("uid") !== ctx.uid) throw new ApiError(404, "not_found", "Order not found");
  if (!verifyCheckoutSignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
    throw new ApiError(400, "bad_signature", "Payment could not be verified. If money was deducted, it will be confirmed automatically or refunded.");
  }
  const r = await fulfillOrder(body.razorpay_order_id, body.razorpay_payment_id, "checkout");
  return json({ ok: true, productId: r.productId ?? order.get("productId") });
});
