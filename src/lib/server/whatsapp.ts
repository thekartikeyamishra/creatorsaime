import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { alertPhrase, templateParam, type AlertEvent } from "@/lib/whatsapp";
import { C } from "./collections";
import { keyedHash, safeEqual } from "./crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

export const TEMPLATES = {
  otp: process.env.WA_TPL_OTP || "cai_otp",
  digest: process.env.WA_TPL_DIGEST || "cai_daily_digest",
  activity: process.env.WA_TPL_ACTIVITY || "cai_new_activity",
  paymentReminder: process.env.WA_TPL_PAYMENT_REMINDER || "cai_payment_reminder",
} as const;
const LANG = process.env.WA_TEMPLATE_LANG || "en";

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

type Component = Record<string, unknown>;

/**
 * Sends an approved template message. Never throws: returns the WhatsApp message id or null.
 * Every attempt is logged in `whatsappMessages` (no message bodies with personal data beyond the template params).
 */
export async function sendTemplate(args: {
  to: string;
  template: string;
  bodyParams?: string[];
  paramMax?: number;
  urlButtonParam?: string;
  otpCode?: string;
  lang?: "en" | "hi";
  purpose: string;
  uid?: string | null;
  dealId?: string | null;
}): Promise<string | null> {
  if (!whatsappConfigured()) return null;
  const components: Component[] = [];
  if (args.otpCode) {
    components.push({ type: "body", parameters: [{ type: "text", text: args.otpCode }] });
    components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: args.otpCode }] });
  } else {
    if (args.bodyParams?.length) components.push({ type: "body", parameters: args.bodyParams.map((t) => ({ type: "text", text: templateParam(t, args.paramMax) })) });
    if (args.urlButtonParam) components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: args.urlButtonParam }] });
  }
  let wamid: string | null = null;
  let error: string | null = null;
  try {
    const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: args.to, type: "template", template: { name: args.template, language: { code: args.lang ?? LANG }, components } }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { messages?: Array<{ id: string }>; error?: { message?: string; code?: number } };
    if (res.ok) wamid = data.messages?.[0]?.id ?? null;
    else error = `${res.status}:${data.error?.code ?? ""}:${(data.error?.message ?? "").slice(0, 160)}`;
  } catch (e) {
    error = e instanceof Error ? e.message.slice(0, 160) : "send_failed";
  }
  try {
    await adminDb().collection(C.whatsappMessages).doc(wamid ?? adminDb().collection(C.whatsappMessages).doc().id).set({
      toHash: keyedHash(args.to),
      template: args.template,
      purpose: args.purpose,
      uid: args.uid ?? null,
      dealId: args.dealId ?? null,
      status: wamid ? "sent" : "failed",
      error,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("[whatsapp] log failed", e);
  }
  if (error) console.error("[whatsapp] send failed", args.template, error);
  return wamid;
}

export function verifyMetaSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  return safeEqual(expected, header);
}

export function newOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Immediate WhatsApp alert to a member who opted in (activity template), with a daily cap.
 * Call from `after()` so it never slows down or breaks the request.
 */
export async function alertMember(uid: string | null | undefined, actor: string, event: AlertEvent, path: string): Promise<void> {
  if (!uid || !whatsappConfigured()) return;
  const db = adminDb();
  const user = await db.collection(C.users).doc(uid).get();
  const wa = user.get("whatsapp") as { waId?: string; verified?: boolean; alerts?: boolean } | undefined;
  if (!wa?.verified || wa.alerts === false || !wa.waId || user.get("status") !== "active") return;
  const day = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  const capRef = db.collection(C.rateLimits).doc(keyedHash(`wa-alert:${uid}:${day}`).slice(0, 40));
  const ok = await db.runTransaction(async (tx) => {
    const s = await tx.get(capRef);
    const n = (s.exists ? (s.get("count") as number) : 0) + 1;
    if (n > 10) return false;
    tx.set(capRef, { bucket: "wa-alert", count: n, expiresAt: new Date(Date.now() + 2 * 86_400_000) });
    return true;
  });
  if (!ok) return;
  const lang = user.get("language") === "hi" ? "hi" : "en";
  await sendTemplate({ to: wa.waId, template: TEMPLATES.activity, lang, bodyParams: [actor, alertPhrase(event, lang)], urlButtonParam: path.replace(/^\//, ""), purpose: "member_alert", uid });
}
