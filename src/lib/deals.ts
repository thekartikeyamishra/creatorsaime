/**
 * Deal Desk domain logic — pure functions shared by client and server (and unit-tested).
 * Amounts are whole rupees (integers). Dates are YYYY-MM-DD strings in IST.
 */
import type { DealTerms } from "./schemas";

export type Side = "creator" | "brand";

export type Party = { uid: string | null; name: string; phone?: string; email?: string };

export type Deliverable = {
  id: string;
  type: string;
  qty: number;
  dueDate: string;
  note: string;
  status: "pending" | "submitted" | "approved";
  proofUrl: string;
  /** IST date the work was first delivered — feeds the on-time record. */
  deliveredAt?: string;
  /** Pod deals: which pod member owns this deliverable. */
  assigneeUid?: string;
};

export type Payment = { id: string; amount: number; date: string; method: string; note: string; recordedBy: string };

export type Acceptance = { at: string; by: string; via: "account" | "link" } | null;

export type Deal = {
  id: string;
  title: string;
  source: "manual" | "campaign";
  campaignId: string | null;
  createdBy: string;
  creatorSide: Party;
  brandSide: Party;
  memberUids: string[];
  deliverables: Deliverable[];
  compensationType: "paid" | "barter" | "paid_plus_product";
  feeAmount: number;
  paymentTerms: string;
  paymentDueDate: string;
  usageRights: string;
  revisionLimit: number;
  payments: Payment[];
  status: "active" | "completed" | "cancelled";
  termsHash: string;
  acceptance: { creator: Acceptance; brand: Acceptance };
  completion: { creator: Acceptance; brand: Acceptance };
  tracking: { code: string | null; destinationUrl: string; clicks: number; promoCode: string; redemptions: number };
  invoiceNumber: string | null;
  pod?: import("./pods").DealPod | null;
  /** Off-platform client's WhatsApp opt-in (masked for display) and auto-reminder state. */
  counterpartyWa?: { optedIn: boolean; number: string } | null;
  autoReminders?: boolean;
  autoReminderCount?: number;
  lastAutoReminderOn?: string | null;
  payouts?: import("./pods").Payout[];
  createdAt: string;
  updatedAt: string;
};

/** Today's date in India as YYYY-MM-DD. */
export function todayIST(now: Date = new Date()): string {
  return new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function received(deal: Pick<Deal, "payments">): number {
  return deal.payments.reduce((s, p) => s + p.amount, 0);
}

export function balance(deal: Pick<Deal, "payments" | "feeAmount">): number {
  return Math.max(0, deal.feeAmount - received(deal));
}

export function isPaymentOverdue(deal: Pick<Deal, "payments" | "feeAmount" | "paymentDueDate" | "status">, today: string): boolean {
  return deal.status !== "cancelled" && balance(deal) > 0 && Boolean(deal.paymentDueDate) && deal.paymentDueDate < today;
}

export type DeskSummary = {
  activeDeals: number;
  completedDeals: number;
  contracted: number;
  received: number;
  outstanding: number;
  overdueAmount: number;
  overduePayments: number;
  overdueDeliverables: number;
  dueThisWeek: number;
  clicks: number;
  redemptions: number;
};

/** Honest, computed-from-your-own-data totals. Cancelled deals are excluded. */
export function summarize(deals: Deal[], today: string = todayIST()): DeskSummary {
  const weekEnd = addDays(today, 7);
  const s: DeskSummary = {
    activeDeals: 0,
    completedDeals: 0,
    contracted: 0,
    received: 0,
    outstanding: 0,
    overdueAmount: 0,
    overduePayments: 0,
    overdueDeliverables: 0,
    dueThisWeek: 0,
    clicks: 0,
    redemptions: 0,
  };
  for (const d of deals) {
    if (d.status === "cancelled") continue;
    if (d.status === "active") s.activeDeals++;
    else s.completedDeals++;
    s.contracted += d.feeAmount;
    s.received += received(d);
    s.outstanding += balance(d);
    if (isPaymentOverdue(d, today)) {
      s.overduePayments++;
      s.overdueAmount += balance(d);
    }
    for (const x of d.deliverables) {
      if (x.status === "approved" || !x.dueDate) continue;
      if (x.dueDate < today) s.overdueDeliverables++;
      else if (x.dueDate <= weekEnd) s.dueThisWeek++;
    }
    s.clicks += d.tracking?.clicks ?? 0;
    s.redemptions += d.tracking?.redemptions ?? 0;
  }
  return s;
}

/** Cost per redemption / per click — the "which creator actually brought customers" number. */
export function roi(deal: Pick<Deal, "feeAmount" | "tracking">): { costPerClick: number | null; costPerRedemption: number | null } {
  const { clicks, redemptions } = deal.tracking ?? { clicks: 0, redemptions: 0 };
  return {
    costPerClick: clicks > 0 && deal.feeAmount > 0 ? Math.round(deal.feeAmount / clicks) : null,
    costPerRedemption: redemptions > 0 && deal.feeAmount > 0 ? Math.round(deal.feeAmount / redemptions) : null,
  };
}

export function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/** Normalise a phone for wa.me: digits only, Indian 10-digit numbers get the 91 prefix. */
export function waPhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function whatsappLink(phone: string | undefined, text: string): string {
  const p = waPhone(phone);
  return `https://wa.me/${p ?? ""}?text=${encodeURIComponent(text)}`;
}

/** NPCI UPI deep link. Opens any UPI app with payee, amount and note pre-filled. */
export function upiLink({ vpa, name, amount, note }: { vpa: string; name: string; amount: number; note: string }): string {
  const q = new URLSearchParams({ pa: vpa, pn: name.slice(0, 50), am: amount.toFixed(2), cu: "INR", tn: note.slice(0, 60) });
  return `upi://pay?${q.toString()}`;
}

export function paymentReminderText(deal: Deal, opts: { senderName: string; upiId?: string; dealUrl?: string; locale?: "en" | "hi" }): string {
  const due = balance(deal);
  if (opts.locale === "hi") {
    const done = deal.deliverables.filter((d) => d.status !== "pending").length;
    return [
      `नमस्ते ${deal.brandSide.name} जी, "${deal.title}" के payment के लिए एक विनम्र याद दिलाना।`,
      `तय फ़ीस: ${formatInr(deal.feeAmount)} · मिला: ${formatInr(received(deal))} · बाकी: ${formatInr(due)}${deal.paymentDueDate ? ` (तारीख़ ${deal.paymentDueDate})` : ""}।`,
      `पूरा हुआ काम: ${done}/${deal.deliverables.length}।`,
      ...(opts.upiId ? [`UPI: ${opts.upiId}`] : []),
      ...(opts.dealUrl ? [`Deal की जानकारी: ${opts.dealUrl}`] : []),
      `धन्यवाद! — ${opts.senderName}`,
    ].join("\n");
  }
  const lines = [
    `Hi ${deal.brandSide.name}, a gentle reminder about "${deal.title}".`,
    `Agreed fee: ${formatInr(deal.feeAmount)} · Received: ${formatInr(received(deal))} · Balance due: ${formatInr(due)}${deal.paymentDueDate ? ` (due ${deal.paymentDueDate})` : ""}.`,
  ];
  const done = deal.deliverables.filter((d) => d.status !== "pending").length;
  lines.push(`Deliverables completed: ${done}/${deal.deliverables.length}.`);
  if (opts.upiId) lines.push(`UPI: ${opts.upiId}`);
  if (opts.dealUrl) lines.push(`Deal details: ${opts.dealUrl}`);
  lines.push(`Thank you! — ${opts.senderName}`);
  return lines.join("\n");
}

export function deliverableReminderText(deal: Deal, senderName: string, locale: "en" | "hi" = "en"): string {
  const pending = deal.deliverables.filter((d) => d.status === "pending");
  if (locale === "hi") {
    const list = pending.map((d) => `• ${d.qty}× ${d.type}${d.dueDate ? ` — ${d.dueDate} तक` : ""}`).join("\n");
    return `नमस्ते ${deal.creatorSide.name} जी, "${deal.title}" के बारे में। बाकी काम:\n${list || "• कुछ बाकी नहीं"}\nकोई मदद चाहिए तो बताइए। — ${senderName}`;
  }
  const list = pending.map((d) => `• ${d.qty}× ${d.type}${d.dueDate ? ` — due ${d.dueDate}` : ""}`).join("\n");
  return `Hi ${deal.creatorSide.name}, quick check-in on "${deal.title}". Pending:\n${list || "• nothing pending"}\nLet me know if you need anything. — ${senderName}`;
}

/**
 * Canonical serialisation of the agreed terms. Its SHA-256 is stored as `termsHash`; acceptance
 * records reference the hash, so any edit to the terms invalidates earlier acceptance.
 */
export function canonicalTerms(t: DealTerms, creatorName: string, brandName: string): string {
  return JSON.stringify({
    v: 1,
    title: t.title,
    creator: creatorName,
    brand: brandName,
    deliverables: t.deliverables.map((d) => [d.type, d.qty, d.dueDate, d.note]),
    compensationType: t.compensationType,
    feeAmount: t.feeAmount,
    paymentTerms: t.paymentTerms,
    paymentDueDate: t.paymentDueDate,
    usageRights: t.usageRights,
    revisionLimit: t.revisionLimit,
  });
}

export function sideOf(deal: Pick<Deal, "creatorSide" | "brandSide">, uid: string): Side | null {
  if (deal.creatorSide.uid === uid) return "creator";
  if (deal.brandSide.uid === uid) return "brand";
  return null;
}

export function otherSide(side: Side): Side {
  return side === "creator" ? "brand" : "creator";
}
