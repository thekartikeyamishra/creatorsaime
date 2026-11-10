import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { Deal } from "@/lib/deals";
import { buildDigest } from "@/lib/digest";
import { daysLeft, extendExpiry, formatPaise, LIMITS_BY_TIER, PRODUCTS, tierAt } from "@/lib/plans";
import { verifyCheckoutSignature, verifyWebhookSignature } from "@/lib/server/razorpay";

const DAY = 86_400_000;

describe("plans", () => {
  it("prices are positive whole paise and yearly is cheaper than 12 months", () => {
    for (const p of Object.values(PRODUCTS)) expect(Number.isInteger(p.amountPaise) && p.amountPaise > 0).toBe(true);
    expect(PRODUCTS.growth_yearly.amountPaise).toBeLessThan(PRODUCTS.growth_monthly.amountPaise * 12);
  });
  it("formats paise as rupees", () => {
    expect(formatPaise(149_900)).toBe("₹1,499");
    expect(formatPaise(1_499_000)).toBe("₹14,990");
  });
  it("tiers follow expiry", () => {
    const now = 1_000 * DAY;
    expect(tierAt(null, now)).toBe("free");
    expect(tierAt(now - 1, now)).toBe("free");
    expect(tierAt(now + DAY, now)).toBe("growth");
  });
  it("stacks purchases and never loses paid days", () => {
    const now = 1_000 * DAY;
    expect(extendExpiry(null, 30, now)).toBe(now + 30 * DAY);
    expect(extendExpiry(now - 5 * DAY, 30, now)).toBe(now + 30 * DAY);
    expect(extendExpiry(now + 10 * DAY, 30, now)).toBe(now + 40 * DAY);
    expect(daysLeft(now + 10 * DAY - 1, now)).toBe(10);
  });
  it("free tier still includes a working product", () => {
    expect(LIMITS_BY_TIER.free.openCampaigns).toBeGreaterThanOrEqual(1);
    expect(LIMITS_BY_TIER.growth.openCampaigns).toBeGreaterThan(LIMITS_BY_TIER.free.openCampaigns);
  });
});

describe("razorpay signatures", () => {
  const secret = "test_secret";
  it("verifies checkout signature and rejects tampering", () => {
    const sig = createHmac("sha256", secret).update("order_ABC123|pay_XYZ789").digest("hex");
    expect(verifyCheckoutSignature("order_ABC123", "pay_XYZ789", sig, secret)).toBe(true);
    expect(verifyCheckoutSignature("order_ABC123", "pay_OTHER1", sig, secret)).toBe(false);
    expect(verifyCheckoutSignature("order_ABC123", "pay_XYZ789", "0".repeat(64), secret)).toBe(false);
  });
  it("verifies webhook body signature; empty secret always fails", () => {
    const body = '{"event":"order.paid"}';
    const sig = createHmac("sha256", "wh").update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, "wh")).toBe(true);
    expect(verifyWebhookSignature(body + " ", sig, "wh")).toBe(false);
    expect(verifyWebhookSignature(body, sig, "")).toBe(false);
  });
});

function deal(over: Partial<Deal>): Deal {
  return {
    id: "d", title: "T", source: "manual", campaignId: null, createdBy: "c1",
    creatorSide: { uid: "c1", name: "Riya" }, brandSide: { uid: "b1", name: "Spice" }, memberUids: ["c1", "b1"],
    deliverables: [{ id: "x", type: "Instagram Reel", qty: 1, dueDate: "2026-11-01", note: "", status: "pending", proofUrl: "" }],
    compensationType: "paid", feeAmount: 5000, paymentTerms: "", paymentDueDate: "2026-11-05", usageRights: "", revisionLimit: 2,
    payments: [], status: "active", termsHash: "", acceptance: { creator: null, brand: null }, completion: { creator: null, brand: null },
    tracking: { code: null, destinationUrl: "", clicks: 0, promoCode: "", redemptions: 0 }, invoiceNumber: null, createdAt: "", updatedAt: "",
    ...over,
  };
}

describe("daily digest", () => {
  it("tells the creator about money owed and the brand about late deliverables", () => {
    const d = [deal({})];
    const c = buildDigest("c1", d, "2026-11-10")!;
    expect(c.title).toBe("Needs attention today");
    expect(c.lines.join(" ")).toContain("₹5,000 overdue");
    const b = buildDigest("b1", d, "2026-11-10")!;
    expect(b.lines.join(" ")).toMatch(/creator deliverable/);
  });
  it("returns null when nothing needs attention, and ignores other people's deals", () => {
    const paid = deal({ payments: [{ id: "p", amount: 5000, date: "2026-11-02", method: "UPI", note: "", recordedBy: "c1" }], deliverables: [] });
    expect(buildDigest("c1", [paid], "2026-11-10")).toBeNull();
    expect(buildDigest("zz", [deal({})], "2026-11-10")).toBeNull();
  });
  it("mentions upcoming work without calling it urgent", () => {
    const soon = deal({ paymentDueDate: "", deliverables: [{ id: "x", type: "Instagram Reel", qty: 1, dueDate: "2026-11-12", note: "", status: "pending", proofUrl: "" }] });
    expect(buildDigest("c1", [soon], "2026-11-10")?.title).toBe("Coming up this week");
  });
});
