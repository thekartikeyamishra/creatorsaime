/**
 * WhatsApp helpers shared by client, server and tests (no secrets here).
 * Messages go through Meta's WhatsApp Cloud API using pre-approved templates only.
 */
import { waPhone } from "./deals";

export const WA_LIMITS = {
  memberAlertsPerDay: 10,
  autoRemindersPerDeal: 3,
  autoReminderGapDays: 3,
  otpTtlMinutes: 10,
  otpMaxAttempts: 5,
} as const;

/** E.164 without "+" (what the Cloud API expects), or null. Indian 10-digit numbers get 91. */
export function toWaId(phone: string): string | null {
  return waPhone(phone);
}

/** Masks a number for display: 919876543210 → +91 •••••• 3210 */
export function maskPhone(waId: string): string {
  if (waId.length < 6) return "•••";
  const cc = waId.startsWith("91") ? "+91" : `+${waId.slice(0, waId.length - 10)}`;
  return `${cc} •••••• ${waId.slice(-4)}`;
}

const STOP_WORDS = new Set(["stop", "unsubscribe", "cancel", "stop all", "band karo", "बंद", "बंद करो"]);
export function isStopMessage(text: string): boolean {
  return STOP_WORDS.has(text.trim().toLowerCase());
}

/** Should an automatic payment reminder go out today? Pure so it can be tested. */
export function autoReminderDue(args: {
  enabled: boolean;
  optedIn: boolean;
  balance: number;
  paymentDueDate: string;
  today: string;
  sent: number;
  lastSentOn: string | null;
}): boolean {
  if (!args.enabled || !args.optedIn || args.balance <= 0 || !args.paymentDueDate) return false;
  if (args.paymentDueDate >= args.today) return false; // only once overdue
  if (args.sent >= WA_LIMITS.autoRemindersPerDeal) return false;
  if (args.lastSentOn) {
    const gap = (Date.parse(`${args.today}T00:00:00Z`) - Date.parse(`${args.lastSentOn}T00:00:00Z`)) / 86_400_000;
    if (gap < WA_LIMITS.autoReminderGapDays) return false;
  }
  return true;
}

export type AlertEvent =
  | { kind: "applied"; title: string }
  | { kind: "hired"; title: string }
  | { kind: "agreed"; title: string }
  | { kind: "completed"; title: string }
  | { kind: "payment"; title: string; amount: number };

/** The {{2}} phrase of the activity template, in the member's language. */
export function alertPhrase(e: AlertEvent, locale: "en" | "hi"): string {
  const amt = "amount" in e ? `₹${e.amount.toLocaleString("en-IN")}` : "";
  if (locale === "hi") {
    switch (e.kind) {
      case "applied": return `ने "${e.title}" के लिए आवेदन किया`;
      case "hired": return `ने आपको "${e.title}" के लिए चुना — कृपया शर्तें देख कर हाँ करें`;
      case "agreed": return `ने "${e.title}" की शर्तों पर हाँ कहा`;
      case "completed": return `ने "${e.title}" का काम पूरा होने की पुष्टि की`;
      case "payment": return `ने "${e.title}" के लिए ${amt} का payment दर्ज किया`;
    }
  }
  switch (e.kind) {
    case "applied": return `applied to "${e.title}"`;
    case "hired": return `hired you for "${e.title}" — please review and agree to the terms`;
    case "agreed": return `agreed to the terms for "${e.title}"`;
    case "completed": return `confirmed "${e.title}" is complete`;
    case "payment": return `recorded a payment of ${amt} for "${e.title}"`;
  }
}

/** Template parameters can't contain newlines/tabs or 4+ consecutive spaces (Meta rule). */
export function templateParam(v: string, max = 120): string {
  return v.replace(/[\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, max) || "-";
}
