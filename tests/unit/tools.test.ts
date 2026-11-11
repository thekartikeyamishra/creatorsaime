import { describe, expect, it } from "vitest";
import { checkDisclosure, engagement, estimateRate, gstModeFor, invoiceTotals, rupeesInWords } from "@/lib/tools";
import { adsTxtLine, isAdEligiblePath } from "@/lib/ads";

describe("estimateRate", () => {
  it("scales with views and shows its assumptions", () => {
    const r = estimateRate({ format: "ig_reel", avgViews: 10_000, niche: "food", usageMonths: 0, exclusivity: false });
    expect(r.low).toBe(2000);
    expect(r.high).toBe(5000);
    expect(r.mid).toBe(3500);
    expect(r.breakdown[0]).toContain("10,000");
  });
  it("applies usage rights, exclusivity and custom CPM", () => {
    const r = estimateRate({ format: "ig_reel", avgViews: 10_000, niche: "food", usageMonths: 3, exclusivity: true, cpmLow: 300, cpmHigh: 300 });
    expect(r.multiplier).toBe(1.5);
    expect(r.low).toBe(4500);
    expect(r.high).toBe(4500);
  });
  it("never returns zero or negative", () => {
    const r = estimateRate({ format: "ig_story", avgViews: -5, niche: "local", usageMonths: 0, exclusivity: false });
    expect(r.low).toBeGreaterThan(0);
  });
});

describe("engagement", () => {
  it("computes by followers and by views", () => {
    const e = engagement({ likes: 400, comments: 50, saves: 30, shares: 20, followers: 10_000, views: 20_000 });
    expect(e.byFollowers).toBe(5);
    expect(e.byViews).toBe(2.5);
    expect(e.band).toBe("average");
  });
  it("handles empty input", () => {
    expect(engagement({ likes: 0, comments: 0, saves: 0, shares: 0, followers: 0 }).band).toBeNull();
  });
});

describe("invoice", () => {
  it("chooses the GST mode", () => {
    expect(gstModeFor(false, "UP", "UP", false)).toBe("none");
    expect(gstModeFor(true, "UP", "UP", false)).toBe("intra");
    expect(gstModeFor(true, "UP", "MH", false)).toBe("inter");
    expect(gstModeFor(true, "UP", "", true)).toBe("export");
  });
  it("totals CGST/SGST, IGST and TDS on the pre-GST amount", () => {
    const lines = [{ description: "Reel", qty: 2, rate: 5000 }];
    expect(invoiceTotals(lines, "intra")).toMatchObject({ subtotal: 10000, cgst: 900, sgst: 900, total: 11800 });
    const inter = invoiceTotals(lines, "inter", 10);
    expect(inter).toMatchObject({ igst: 1800, total: 11800, tds: 1000, expectedCredit: 10800 });
    expect(invoiceTotals(lines, "export").total).toBe(10000);
  });
  it("writes amounts in Indian words", () => {
    expect(rupeesInWords(11800)).toBe("Eleven Thousand Eight Hundred Rupees Only");
    expect(rupeesInWords(1234567.5)).toBe("Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees and Fifty Paise Only");
    expect(rupeesInWords(21000000)).toBe("Two Crore Ten Lakh Rupees Only");
    expect(rupeesInWords(0)).toBe("Zero Rupees Only");
  });
});

describe("checkDisclosure", () => {
  it("passes an upfront permitted label", () => {
    expect(checkDisclosure("#Ad Trying the new menu at Spice Route! #food #prayagraj").ok).toBe(true);
    expect(checkDisclosure("Sponsored: my honest review").ok).toBe(true);
  });
  it("fails vague or buried labels", () => {
    const v = checkDisclosure("Loved it! #foodie #collab #prayagraj");
    expect(v.ok).toBe(false);
    expect(v.vague).toContain("collab");
    expect(checkDisclosure("Great food #a #b #c #d #ad").ok).toBe(false);
    expect(checkDisclosure("No label here").found).toHaveLength(0);
  });
  it("does not treat words containing 'ad' as a label", () => {
    expect(checkDisclosure("I already had lunch, so glad").found).toHaveLength(0);
  });
});

describe("ads policy", () => {
  it("allows ads only on tools and guides", () => {
    for (const p of ["/tools", "/tools/rate-calculator", "/guides", "/guides/gst-for-creators-india"]) expect(isAdEligiblePath(p)).toBe(true);
    for (const p of ["/", "/pricing", "/join", "/login", "/dashboard", "/admin", "/d/abc", "/p/riya", "/privacy", "/tools/a/b"]) expect(isAdEligiblePath(p)).toBe(false);
  });
  it("builds the ads.txt line", () => {
    expect(adsTxtLine("pub-4557897331416844")).toBe("google.com, pub-4557897331416844, DIRECT, f08c47fec0942fa0");
  });
});
