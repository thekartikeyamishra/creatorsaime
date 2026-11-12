import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { site } from "@/lib/config";
import { renewalStage } from "@/lib/plans";
import { C } from "./collections";
import { sendEmail } from "./notify";

/**
 * Prepaid plans don't auto-debit, so renewal is a moment we must earn. Members hear from us exactly
 * three times per term — 7 days before, 1 day before, and the day it ends — never more, using
 * deterministic notification ids so re-runs can't double-send.
 */
export async function sendRenewalReminders(nowMs = Date.now()): Promise<number> {
  const db = adminDb();
  const snap = await db
    .collection(C.subscriptions)
    .where("expiresAt", ">=", Timestamp.fromMillis(nowMs - 86_400_000))
    .where("expiresAt", "<=", Timestamp.fromMillis(nowMs + 8 * 86_400_000))
    .limit(500)
    .get();
  let sent = 0;
  const batch = db.batch();
  const emails: Array<Promise<boolean>> = [];
  for (const d of snap.docs) {
    const exp = (d.get("expiresAt") as Timestamp).toMillis();
    const stage = renewalStage(exp, nowMs);
    if (!stage) continue;
    const trial = d.get("trial") === true;
    const id = `renew_${d.id}_${exp}_${stage}`;
    const title =
      stage === "ended"
        ? trial ? "Your Growth trial has ended" : "Your Growth plan has ended"
        : `${trial ? "Your Growth trial" : "Growth"} ends ${stage === "d1" ? "tomorrow" : "in 7 days"}`;
    const body = stage === "ended"
      ? "Featured briefs, city-level Rate Index and cost-per-customer reports are paused. Renew in one tap — no auto-debit."
      : trial
        ? "Keep featured briefs and city-level insights. Choose a plan — yearly saves 2 months."
        : "Renew now and the new term starts after your current one — you never lose days. Yearly saves 2 months.";
    batch.set(db.collection(C.notifications).doc(id), { uid: d.id, type: "plan_expiring", title, body, href: "/dashboard/plan", read: false, createdAt: FieldValue.serverTimestamp() }, { merge: false });
    sent++;
    if (stage !== "d7") {
      const user = await db.collection(C.users).doc(d.id).get();
      const email = user.get("email") as string | undefined;
      if (email) emails.push(sendEmail(email, `${site.name}: ${title}`, `${body}\n\nRenew: ${site.url}/dashboard/plan`));
    }
  }
  if (sent) await batch.commit();
  await Promise.allSettled(emails);
  return sent;
}
