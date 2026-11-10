import { describe, expect, it } from "vitest";
import type { Deal } from "@/lib/deals";
import { paymentReminderText } from "@/lib/deals";
import { buildDigest } from "@/lib/digest";
import { MESSAGES, pickLocale, translate } from "@/lib/i18n";
import { alertPhrase } from "@/lib/whatsapp";

describe("dictionaries", () => {
  it("every English key has a non-empty Hindi translation with the same {placeholders}", () => {
    for (const [key, en] of Object.entries(MESSAGES.en)) {
      const hi = (MESSAGES.hi as Record<string, string>)[key];
      expect(hi, key).toBeTruthy();
      const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      expect(vars(hi!), key).toEqual(vars(en));
    }
  });
  it("interpolates and falls back", () => {
    expect(translate("hi", "desk.with", { name: "Spice" })).toBe("Spice के साथ");
    expect(translate("en", "desk.due", { amount: "₹10" })).toBe("₹10 due");
  });
});

describe("pickLocale", () => {
  it("query > cookie > Accept-Language > en", () => {
    expect(pickLocale({ query: "hi", cookie: "en" })).toBe("hi");
    expect(pickLocale({ cookie: "hi", acceptLanguage: "en-US" })).toBe("hi");
    expect(pickLocale({ acceptLanguage: "hi-IN,hi;q=0.9,en;q=0.8" })).toBe("hi");
    expect(pickLocale({ acceptLanguage: "en-IN,hi;q=0.5" })).toBe("en");
    expect(pickLocale({ query: "fr" })).toBe("en");
  });
});

const deal = {
  id: "d", title: "दिवाली लॉन्च", source: "manual", campaignId: null, createdBy: "c1",
  creatorSide: { uid: "c1", name: "Riya" }, brandSide: { uid: null, name: "Spice Route" }, memberUids: ["c1"],
  deliverables: [{ id: "a", type: "Instagram Reel", qty: 1, dueDate: "2026-11-01", note: "", status: "submitted", proofUrl: "" }],
  compensationType: "paid", feeAmount: 10000, paymentTerms: "", paymentDueDate: "2026-11-05", usageRights: "", revisionLimit: 2,
  payments: [{ id: "p", amount: 4000, date: "2026-11-01", method: "UPI", note: "", recordedBy: "c1" }],
  status: "active", termsHash: "", acceptance: { creator: null, brand: null }, completion: { creator: null, brand: null },
  tracking: { code: null, destinationUrl: "", clicks: 0, promoCode: "", redemptions: 0 }, invoiceNumber: null, createdAt: "", updatedAt: "",
} as Deal;

describe("Hindi messages", () => {
  it("payment reminder in Hindi keeps the numbers and UPI", () => {
    const t = paymentReminderText(deal, { senderName: "Riya", upiId: "riya@okhdfcbank", locale: "hi" });
    expect(t).toContain("नमस्ते Spice Route जी");
    expect(t).toContain("₹6,000");
    expect(t).toContain("riya@okhdfcbank");
  });
  it("digest and WhatsApp alert phrases in Hindi", () => {
    const d = buildDigest("c1", [deal], "2026-11-10", "hi")!;
    expect(d.title).toBe("आज ध्यान देने वाली बातें");
    expect(d.lines[0]).toContain("₹6,000");
    expect(alertPhrase({ kind: "payment", title: "X", amount: 5000 }, "hi")).toContain("₹5,000");
    expect(alertPhrase({ kind: "applied", title: "X" }, "en")).toBe('applied to "X"');
  });
});
