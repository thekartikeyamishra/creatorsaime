import "server-only";
import { createHmac } from "node:crypto";
import { ServiceUnavailableError } from "@/lib/firebase/admin";
import { safeEqual } from "./crypto";

/** Minimal Razorpay REST client (Orders API) — no SDK dependency. */
export function razorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function creds(): { id: string; secret: string } {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new ServiceUnavailableError("Payments are not configured");
  return { id, secret };
}

export function publicKeyId(): string {
  return creds().id;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string; status: string };

export async function createOrder(args: { amountPaise: number; receipt: string; notes: Record<string, string> }): Promise<RazorpayOrder> {
  const { id, secret } = creds();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}` },
    body: JSON.stringify({ amount: args.amountPaise, currency: "INR", receipt: args.receipt, notes: args.notes }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error("[razorpay] order create failed", res.status, await res.text().catch(() => ""));
    throw new ServiceUnavailableError("Could not start payment. Please try again.");
  }
  return (await res.json()) as RazorpayOrder;
}

/** Checkout handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string, secret = creds().secret): boolean {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret = process.env.RAZORPAY_WEBHOOK_SECRET || ""): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}
