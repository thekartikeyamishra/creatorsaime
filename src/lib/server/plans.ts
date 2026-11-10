import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { SCHEMA_VERSION } from "@/lib/config";
import { extendExpiry, PRODUCTS, tierAt, type ProductId, type Tier } from "@/lib/plans";
import { auditIn } from "./audit";
import { C } from "./collections";
import { notifyIn } from "./notify";

export type OrderDoc = {
  uid: string;
  productId: ProductId;
  amountPaise: number;
  currency: "INR";
  status: "created" | "paid";
  receiptNo: string | null;
  paymentId: string | null;
  paidVia: "checkout" | "webhook" | null;
  createdAt: Timestamp;
  paidAt: Timestamp | null;
  buyer: { name: string; email: string };
};

export async function getTier(uid: string): Promise<{ tier: Tier; expiresAt: number | null }> {
  const snap = await adminDb().collection(C.subscriptions).doc(uid).get();
  const exp = snap.exists ? ((snap.get("expiresAt") as Timestamp | undefined)?.toMillis() ?? null) : null;
  return { tier: tierAt(exp), expiresAt: exp };
}

/**
 * Idempotent fulfilment. Safe to call from both the checkout callback and the webhook,
 * in any order, any number of times: only the first call changes anything.
 */
export async function fulfillOrder(orderId: string, paymentId: string, via: "checkout" | "webhook", paidAmountPaise?: number): Promise<{ fulfilled: boolean; productId?: ProductId }> {
  const db = adminDb();
  const orderRef = db.collection(C.orders).doc(orderId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) return { fulfilled: false };
    const order = snap.data() as OrderDoc;
    if (order.status === "paid") return { fulfilled: false, productId: order.productId };
    if (paidAmountPaise !== undefined && paidAmountPaise !== order.amountPaise) {
      console.error("[plans] amount mismatch", orderId, paidAmountPaise, order.amountPaise);
      return { fulfilled: false };
    }
    const product = PRODUCTS[order.productId];
    const subRef = db.collection(C.subscriptions).doc(order.uid);
    const counterRef = db.collection(C.counters).doc("receipts");
    const [sub, counter] = await Promise.all([tx.get(subRef), tx.get(counterRef)]);

    const seq = ((counter.exists ? (counter.get("next") as number) : 1) || 1);
    const receiptNo = `CAI-${new Date().getFullYear()}-${String(seq).padStart(6, "0")}`;
    const now = FieldValue.serverTimestamp();
    tx.set(counterRef, { next: seq + 1 }, { merge: true });
    tx.update(orderRef, { status: "paid", paymentId, paidVia: via, paidAt: now, receiptNo });

    if (product.kind === "plan" && product.days) {
      const current = sub.exists ? ((sub.get("expiresAt") as Timestamp | undefined)?.toMillis() ?? null) : null;
      const expiresAt = Timestamp.fromMillis(extendExpiry(current, product.days));
      tx.set(subRef, { uid: order.uid, tier: "growth", expiresAt, lastOrderId: orderId, updatedAt: now, schemaVersion: SCHEMA_VERSION }, { merge: true });
      notifyIn(tx, order.uid, {
        type: "plan_activated",
        title: "Growth plan active",
        body: `Thanks! Your plan runs until ${expiresAt.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.`,
        href: "/dashboard/plan",
      });
    } else {
      tx.create(db.collection(C.managedRequests).doc(orderId), {
        uid: order.uid,
        orderId,
        status: "new",
        buyer: order.buyer,
        createdAt: now,
        schemaVersion: SCHEMA_VERSION,
      });
      notifyIn(tx, order.uid, {
        type: "managed_pilot_received",
        title: "Managed Pilot booked",
        body: "We'll contact you within one business day to plan your campaign.",
        href: "/dashboard/plan",
      });
    }
    auditIn(tx, { actorUid: order.uid, actorRole: "user", action: `order.paid.${order.productId}`, targetType: "order", targetId: orderId, meta: { via, amountPaise: order.amountPaise } });
    return { fulfilled: true, productId: order.productId };
  });
}
