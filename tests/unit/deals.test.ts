import { describe, expect, it } from "vitest";
import {
  addDays,
  balance,
  canonicalTerms,
  isPaymentOverdue,
  paymentReminderText,
  roi,
  sideOf,
  summarize,
  todayIST,
  upiLink,
  waPhone,
  whatsappLink,
  type Deal,
} from "@/lib/deals";
import { shortId, trackingCode } from "@/lib/ids";
import { billingSchema, campaignSchema, dealActionSchema, dealCreateSchema, dealTermsSchema, phoneSchema, upiIdSchema } from "@/lib/schemas";

function deal(over: Partial<Deal> = {}): Deal {
  return {
    id: "d1",
    title: "Diwali menu launch",
    source: "manual",
    campaignId: null,
    createdBy: "u1",
    creatorSide: { uid: "u1", name: "Riya" },
    brandSide: { uid: null, name: "Spice Route", phone: "9876543210" },
    memberUids: ["u1"],
    deliverables: [
      { id: "a", type: "Instagram Reel", qty: 1, dueDate: "2026-11-01", note: "", status: "pending", proofUrl: "" },
      { id: "b", type: "Instagram Story", qty: 3, dueDate: "2026-11-12", note: "", status: "approved", proofUrl: "" },
    ],
    compensationType: "paid",
    feeAmount: 10000,
    paymentTerms: "",
    paymentDueDate: "2026-11-05",
    usageRights: "",
    revisionLimit: 2,
    payments: [{ id: "p", amount: 4000, date: "2026-10-30", method: "UPI", note: "", recordedBy: "u1" }],
    status: "active",
    termsHash: "x",
    acceptance: { creator: null, brand: null },
    completion: { creator: null, brand: null },
    tracking: { code: null, destinationUrl: "", clicks: 200, promoCode: "", redemptions: 25 },
    invoiceNumber: null,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

describe("money", () => {
  it("computes balance and overdue", () => {
    const d = deal();
    expect(balance(d)).toBe(6000);
    expect(isPaymentOverdue(d, "2026-11-08")).toBe(true);
    expect(isPaymentOverdue(d, "2026-11-04")).toBe(false);
    expect(isPaymentOverdue({ ...d, status: "cancelled" }, "2026-11-08")).toBe(false);
  });
  it("never reports negative balance on overpayment", () => {
    expect(balance(deal({ payments: [{ id: "x", amount: 99999, date: "2026-01-01", method: "UPI", note: "", recordedBy: "u1" }] }))).toBe(0);
  });
  it("summarises the desk and excludes cancelled deals", () => {
    const s = summarize([deal(), deal({ id: "d2", status: "cancelled", feeAmount: 50000 })], "2026-11-08");
    expect(s.contracted).toBe(10000);
    expect(s.received).toBe(4000);
    expect(s.outstanding).toBe(6000);
    expect(s.overduePayments).toBe(1);
    expect(s.overdueDeliverables).toBe(1);
    expect(s.dueThisWeek).toBe(0);
    expect(s.clicks).toBe(200);
  });
  it("computes cost per customer", () => {
    expect(roi(deal())).toEqual({ costPerClick: 50, costPerRedemption: 400 });
    expect(roi(deal({ tracking: { code: null, destinationUrl: "", clicks: 0, promoCode: "", redemptions: 0 } }))).toEqual({ costPerClick: null, costPerRedemption: null });
  });
});

describe("dates", () => {
  it("todayIST rolls over at IST midnight", () => {
    expect(todayIST(new Date("2026-11-08T18:29:00Z"))).toBe("2026-11-08");
    expect(todayIST(new Date("2026-11-08T18:31:00Z"))).toBe("2026-11-09");
  });
  it("addDays crosses months", () => expect(addDays("2026-11-28", 7)).toBe("2026-12-05"));
});

describe("whatsapp + upi", () => {
  it.each([
    ["98765 43210", "919876543210"],
    ["+91 98765-43210", "919876543210"],
    ["09876543210", "919876543210"],
    ["+44 7700 900123", "447700900123"],
    ["123", null],
    ["", null],
  ])("waPhone(%s)", (input, out) => expect(waPhone(input)).toBe(out));
  it("builds an encoded wa.me link", () => {
    expect(whatsappLink("9876543210", "hi & bye")).toBe("https://wa.me/919876543210?text=hi%20%26%20bye");
  });
  it("builds a UPI deep link", () => {
    const u = upiLink({ vpa: "riya@okhdfc", name: "Riya S", amount: 6000, note: "Diwali" });
    expect(u.startsWith("upi://pay?")).toBe(true);
    const q = new URLSearchParams(u.slice("upi://pay?".length));
    expect(q.get("pa")).toBe("riya@okhdfc");
    expect(q.get("am")).toBe("6000.00");
    expect(q.get("cu")).toBe("INR");
  });
  it("reminder text includes balance and UPI", () => {
    const t = paymentReminderText(deal(), { senderName: "Riya", upiId: "riya@okhdfc" });
    expect(t).toContain("₹6,000");
    expect(t).toContain("riya@okhdfc");
    expect(t).toContain("1/2");
  });
});

describe("terms", () => {
  const terms = dealTermsSchema.parse({
    title: "Launch",
    deliverables: [{ type: "Instagram Reel", qty: 1 }],
    compensationType: "paid",
    feeAmount: 5000,
  });
  it("canonical form changes when anything material changes", () => {
    const a = canonicalTerms(terms, "Riya", "Spice");
    expect(canonicalTerms(terms, "Riya", "Spice")).toBe(a);
    expect(canonicalTerms({ ...terms, feeAmount: 5001 }, "Riya", "Spice")).not.toBe(a);
    expect(canonicalTerms(terms, "Riya", "Spice Route")).not.toBe(a);
  });
  it("identifies sides", () => {
    expect(sideOf(deal(), "u1")).toBe("creator");
    expect(sideOf(deal(), "zzz")).toBeNull();
  });
});

describe("Stage 2 schemas", () => {
  it("deal create requires a counterparty name and a deliverable", () => {
    expect(dealCreateSchema.safeParse({ terms: { title: "abc", deliverables: [], compensationType: "paid", feeAmount: 1 }, counterparty: { name: "X" } }).success).toBe(false);
    expect(
      dealCreateSchema.safeParse({ terms: { title: "abc", deliverables: [{ type: "Other", qty: 1 }], compensationType: "paid", feeAmount: 1 }, counterparty: { name: "Spice" } }).success,
    ).toBe(true);
  });
  it("rejects fractional and huge amounts", () => {
    const base = { title: "abc", deliverables: [{ type: "Other", qty: 1 }], compensationType: "paid" };
    expect(dealTermsSchema.safeParse({ ...base, feeAmount: 10.5 }).success).toBe(false);
    expect(dealTermsSchema.safeParse({ ...base, feeAmount: 1e9 }).success).toBe(false);
  });
  it("action union rejects unknown actions and bad ids", () => {
    expect(dealActionSchema.safeParse({ action: "delete_everything" }).success).toBe(false);
    expect(dealActionSchema.safeParse({ action: "deliverable_status", deliverableId: "../x", status: "approved" }).success).toBe(false);
    expect(dealActionSchema.safeParse({ action: "redemption", delta: 5 }).success).toBe(false);
    expect(dealActionSchema.safeParse({ action: "set_tracking", destinationUrl: "javascript:alert(1)", promoCode: "" }).success).toBe(false);
  });
  it("campaign budget max must be >= min and paid needs a budget", () => {
    const c = {
      title: "Weekend brunch",
      description: "x".repeat(40),
      city: "Prayagraj",
      categories: ["Food & Restaurants"],
      deliverables: [{ type: "Instagram Reel", qty: 1 }],
      compensationType: "paid",
      budgetMin: 5000,
      budgetMax: 3000,
      creatorsNeeded: 3,
      applyBy: "2030-01-01",
    };
    expect(campaignSchema.safeParse(c).success).toBe(false);
    expect(campaignSchema.safeParse({ ...c, budgetMin: 0, budgetMax: 0 }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...c, compensationType: "barter", budgetMin: 0, budgetMax: 0 }).success).toBe(true);
  });
  it("validates UPI IDs and phones", () => {
    expect(upiIdSchema.safeParse("riya@okhdfcbank").success).toBe(true);
    expect(upiIdSchema.safeParse("not-a-upi").success).toBe(false);
    expect(phoneSchema.parse("98765 43210")).toBe("9876543210");
    expect(phoneSchema.safeParse("12").success).toBe(false);
    expect(billingSchema.parse({ legalName: "Riya" }).invoicePrefix).toBe("INV");
  });
});

describe("ids", () => {
  it("shortId and trackingCode formats", () => {
    expect(shortId()).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(trackingCode()).toMatch(/^[0-9A-HJKMNP-TV-Z]{7}$/);
  });
});
