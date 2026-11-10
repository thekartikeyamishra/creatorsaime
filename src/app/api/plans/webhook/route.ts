import { fulfillOrder } from "@/lib/server/plans";
import { verifyWebhookSignature } from "@/lib/server/razorpay";

export const runtime = "nodejs";

type Event = {
  event: string;
  payload?: {
    payment?: { entity?: { id: string; order_id: string; amount: number; status: string } };
    order?: { entity?: { id: string; amount_paid: number; status: string } };
  };
};

/**
 * Razorpay webhook (server-to-server). Authenticated by HMAC over the raw body — no Origin/CSRF check.
 * Always answers 200 for well-signed events so Razorpay doesn't retry forever on events we ignore.
 */
export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  if (raw.length > 100_000) return new Response("too large", { status: 413 });
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") || "")) {
    return new Response("invalid signature", { status: 401 });
  }
  let evt: Event;
  try {
    evt = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  try {
    const p = evt.payload?.payment?.entity;
    if ((evt.event === "payment.captured" || evt.event === "order.paid") && p?.order_id && p.id) {
      await fulfillOrder(p.order_id, p.id, "webhook", p.amount);
    }
  } catch (err) {
    console.error("[webhook] fulfilment error", err);
    return new Response("retry", { status: 500 }); // let Razorpay retry
  }
  return new Response("ok", { status: 200 });
}
