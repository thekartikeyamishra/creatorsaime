import { formatInr, sideOf, summarize, type Deal } from "./deals";

export type Digest = { title: string; lines: string[] } | null;

/** Builds a short, honest daily nudge from a member's own deals. Null when nothing needs attention. */
export function buildDigest(uid: string, deals: Deal[], today: string, locale: "en" | "hi" = "en"): Digest {
  const mine = deals.filter((d) => d.status === "active" && d.memberUids.includes(uid));
  if (mine.length === 0) return null;
  const asCreator = mine.filter((d) => sideOf(d, uid) === "creator");
  const asBrand = mine.filter((d) => sideOf(d, uid) === "brand");
  const lines: string[] = [];
  const c = summarize(asCreator, today);
  const b = summarize(asBrand, today);
  if (locale === "hi") {
    if (c.overduePayments > 0) lines.push(`${c.overduePayments} क्लाइंट से ${formatInr(c.overdueAmount)} बकाया है — एक टैप में reminder भेजें।`);
    if (c.overdueDeliverables > 0) lines.push(`आपके ${c.overdueDeliverables} काम की तारीख़ निकल चुकी है।`);
    if (b.overdueDeliverables > 0) lines.push(`क्रिएटर्स के ${b.overdueDeliverables} काम की तारीख़ निकल चुकी है — WhatsApp पर याद दिलाएं।`);
    if (b.overduePayments > 0) lines.push(`${formatInr(b.overdueAmount)} का payment तारीख़ के बाद भी बाकी है।`);
    const soon = c.dueThisWeek + b.dueThisWeek;
    if (soon > 0) lines.push(`अगले 7 दिन में ${soon} काम जमा करने हैं।`);
    if (lines.length === 0) return null;
    const urgentHi = c.overduePayments + c.overdueDeliverables + b.overdueDeliverables + b.overduePayments > 0;
    return { title: urgentHi ? "आज ध्यान देने वाली बातें" : "इस हफ़्ते आने वाला काम", lines };
  }
  if (c.overduePayments > 0) lines.push(`${formatInr(c.overdueAmount)} overdue from ${c.overduePayments} client${c.overduePayments > 1 ? "s" : ""} — send a one-tap reminder.`);
  if (c.overdueDeliverables > 0) lines.push(`${c.overdueDeliverables} of your deliverable${c.overdueDeliverables > 1 ? "s are" : " is"} past due.`);
  if (b.overdueDeliverables > 0) lines.push(`${b.overdueDeliverables} creator deliverable${b.overdueDeliverables > 1 ? "s are" : " is"} past due — nudge on WhatsApp.`);
  if (b.overduePayments > 0) lines.push(`You have ${formatInr(b.overdueAmount)} in payments past their due date.`);
  const dueSoon = c.dueThisWeek + b.dueThisWeek;
  if (dueSoon > 0) lines.push(`${dueSoon} deliverable${dueSoon > 1 ? "s" : ""} due in the next 7 days.`);
  if (lines.length === 0) return null;
  const urgent = c.overduePayments + c.overdueDeliverables + b.overdueDeliverables + b.overduePayments > 0;
  return { title: urgent ? "Needs attention today" : "Coming up this week", lines };
}
