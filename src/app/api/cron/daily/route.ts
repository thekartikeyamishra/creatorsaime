import { FieldValue, Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { site } from "@/lib/config";
import { balance, formatInr, todayIST, type Deal } from "@/lib/deals";
import { generateInviteCode } from "@/lib/ids";
import { autoReminderDue } from "@/lib/whatsapp";
import { sha256 } from "@/lib/server/crypto";
import { notifyNow } from "@/lib/server/notify";
import { sendTemplate, TEMPLATES, whatsappConfigured } from "@/lib/server/whatsapp";
import { buildDigest } from "@/lib/digest";
import { C } from "@/lib/server/collections";
import { safeEqual } from "@/lib/server/crypto";
import { toClientDeal, type DealDoc } from "@/lib/server/deals";
import { sendEmail } from "@/lib/server/notify";
import { qualifyPendingReferrals } from "@/lib/server/referrals";
import { sendRenewalReminders } from "@/lib/server/renewals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily 09:00 IST job (see vercel.json): one in-app digest per member who has something overdue
 * or due this week, plus an optional email. Idempotent per day via deterministic notification ids.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response("unauthorized", { status: 401 });

  const db = adminDb();
  const today = todayIST();
  const byUser = new Map<string, Deal[]>();
  let last: QueryDocumentSnapshot | undefined;
  let scanned = 0;
  for (;;) {
    let q = db.collection(C.deals).where("status", "==", "active").orderBy("__name__").limit(500);
    if (last) q = q.startAfter(last);
    const page = await q.get();
    for (const d of page.docs) {
      const deal = toClientDeal(d.id, d.data() as DealDoc);
      for (const uid of deal.memberUids) {
        const list = byUser.get(uid);
        if (list) list.push(deal);
        else byUser.set(uid, [deal]);
      }
    }
    scanned += page.size;
    if (page.size < 500 || scanned >= 20_000) break;
    last = page.docs[page.docs.length - 1];
  }

  let notified = 0;
  let emailed = 0;
  let batch = db.batch();
  let ops = 0;
  const emails: Array<{ uid: string; title: string; lines: string[] }> = [];
  for (const [uid, deals] of byUser) {
    const digest = buildDigest(uid, deals, today);
    if (!digest) continue;
    batch.set(db.collection(C.notifications).doc(`digest_${uid}_${today}`), {
      uid,
      type: "digest",
      title: digest.title,
      body: digest.lines.join(" "),
      href: "/dashboard/deals",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    notified++;
    emails.push({ uid, ...digest });
    if (++ops >= 450) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops) await batch.commit();

  if (process.env.RESEND_API_KEY) {
    for (const e of emails) {
      const u = await db.collection(C.users).doc(e.uid).get();
      if (!u.exists || u.get("status") !== "active" || u.get("emailDigest") === false) continue;
      const text = `${e.title}\n\n${e.lines.map((l) => `• ${l}`).join("\n")}\n\nOpen your Deal Desk: ${site.url}/dashboard/deals\n\n— CreatorsAI\nYou get this because you have active deals. Turn it off in Account settings.`;
      if (await sendEmail(u.get("email") as string, `CreatorsAI · ${e.title}`, text)) emailed++;
    }
  }
  // ── WhatsApp: daily digest to opted-in members ──
  let waDigests = 0;
  let waReminders = 0;
  if (whatsappConfigured()) {
    for (const e of emails) {
      const u = await db.collection(C.users).doc(e.uid).get();
      const wa = u.get("whatsapp") as { waId?: string; verified?: boolean; digest?: boolean } | undefined;
      if (!wa?.verified || wa.digest === false || !wa.waId || u.get("status") !== "active") continue;
      const first = String(u.get("displayName") || "there").split(" ")[0]!;
      const lang = u.get("language") === "hi" ? "hi" : "en";
      const lines = lang === "hi" ? (buildDigest(e.uid, byUser.get(e.uid) ?? [], today, "hi")?.lines ?? e.lines) : e.lines;
      if (await sendTemplate({ to: wa.waId, template: TEMPLATES.digest, lang, bodyParams: [first, lines.join(" ")], paramMax: 600, purpose: "digest", uid: e.uid })) waDigests++;
    }

    // ── WhatsApp: automatic payment reminders to clients who opted in on their deal link ──
    const due = await db.collection(C.deals).where("autoReminders", "==", true).where("status", "==", "active").limit(500).get();
    for (const d of due.docs) {
      const raw = d.data() as DealDoc;
      const cw = raw.counterpartyWa;
      const deal = toClientDeal(d.id, raw);
      const ok = autoReminderDue({
        enabled: true,
        optedIn: Boolean(cw),
        balance: balance(deal),
        paymentDueDate: deal.paymentDueDate,
        today,
        sent: raw.autoReminderCount ?? 0,
        lastSentOn: raw.lastAutoReminderOn ?? null,
      });
      if (!ok || !cw || raw.brandSide.uid) continue;
      // Fresh private link for the button (replaces the previous one).
      const token = generateInviteCode();
      const hash = sha256(token);
      const batch = db.batch();
      if (raw.shareLinkHash) batch.delete(db.collection(C.dealLinks).doc(raw.shareLinkHash));
      batch.create(db.collection(C.dealLinks).doc(hash), { dealId: d.id, side: "brand", createdBy: "system", createdAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 60 * 86_400_000) });
      batch.update(d.ref, { shareLinkHash: hash, autoReminderCount: (raw.autoReminderCount ?? 0) + 1, lastAutoReminderOn: today });
      await batch.commit();
      const wamid = await sendTemplate({
        to: cw.waId,
        template: TEMPLATES.paymentReminder,
        lang: cw.lang === "hi" ? "hi" : "en",
        bodyParams: [cw.name || raw.brandSide.name, raw.creatorSide.name, raw.title, formatInr(balance(deal)).replace("₹", ""), raw.paymentDueDate],
        urlButtonParam: token,
        purpose: "auto_payment_reminder",
        uid: raw.creatorSide.uid,
        dealId: d.id,
      });
      if (wamid) {
        waReminders++;
        await notifyNow(raw.creatorSide.uid, { type: "payment_recorded", title: `WhatsApp reminder sent to ${raw.brandSide.name}`, body: `${raw.title} · ${formatInr(balance(deal))} due (${(raw.autoReminderCount ?? 0) + 1}/3)`, href: `/dashboard/deals/${d.id}` });
      }
    }
  }

  // Growth loops: qualify referrals whose event happened; prepaid renewal reminders (each isolated).
  const referralsQualified = await qualifyPendingReferrals().catch((e) => (console.error("[cron] referrals", e), 0));
  const renewalReminders = await sendRenewalReminders().catch((e) => (console.error("[cron] renewals", e), 0));

  return Response.json({ ok: true, today, scanned, notified, emailed, waDigests, waReminders, referralsQualified, renewalReminders });
}
