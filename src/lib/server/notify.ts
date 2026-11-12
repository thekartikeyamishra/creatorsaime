import "server-only";
import { FieldValue, type Transaction, type WriteBatch } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { C } from "./collections";

export type NotificationType =
  | "application_received"
  | "application_shortlisted"
  | "application_accepted"
  | "terms_agreed"
  | "completion_confirmed"
  | "payment_recorded"
  | "deliverable_delivered"
  | "digest"
  | "plan_activated"
  | "managed_pilot_received"
  | "pod_invite"
  | "pod_hired"
  | "payout_recorded"
  | "referral_joined"
  | "referral_rewarded"
  | "review_received"
  | "plan_expiring";

export type Notice = { type: NotificationType; title: string; body?: string; href?: string };

/** In-app notification, written atomically with the action that caused it. Never contains secrets. */
export function notifyIn(writer: Transaction | WriteBatch, uid: string | null | undefined, n: Notice, id?: string): void {
  if (!uid) return;
  const col = adminDb().collection(C.notifications);
  const ref = id ? col.doc(id) : col.doc();
  (writer as WriteBatch).set(ref, { uid, ...n, body: n.body ?? "", href: n.href ?? "", read: false, createdAt: FieldValue.serverTimestamp() });
}

export async function notifyNow(uid: string | null | undefined, n: Notice): Promise<void> {
  if (!uid) return;
  try {
    const batch = adminDb().batch();
    notifyIn(batch, uid, n);
    await batch.commit();
  } catch (err) {
    console.error("[notify] failed", err);
  }
}

/** Optional email via Resend's HTTP API. Best-effort; never throws. */
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || "CreatorsAI <hello@creatorsai.me>", to: [to], subject, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error("[email] send failed", res.status);
    return res.ok;
  } catch (err) {
    console.error("[email] send error", err);
    return false;
  }
}
