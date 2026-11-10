import { describe, expect, it } from "vitest";
import type { Deal } from "@/lib/deals";
import { aggregateBenchmarks, benchmarkKey, computeReliability, fairness, normCity, paidInFullDate, percentile, sampleFromDeal, type BenchmarkSample } from "@/lib/insights";

function deal(over: Partial<Deal> & { verifiedCompletion?: boolean }): Deal {
  return {
    id: "d", title: "T", source: "manual", campaignId: null, createdBy: "c1",
    creatorSide: { uid: "c1", name: "Riya" }, brandSide: { uid: "b1", name: "Spice" }, memberUids: ["c1", "b1"],
    deliverables: [{ id: "x", type: "Instagram Reel", qty: 2, dueDate: "2026-11-05", note: "", status: "approved", proofUrl: "", deliveredAt: "2026-11-04" }],
    compensationType: "paid", feeAmount: 8000, paymentTerms: "", paymentDueDate: "2026-11-10", usageRights: "", revisionLimit: 2,
    payments: [{ id: "p", amount: 8000, date: "2026-11-09", method: "UPI", note: "", recordedBy: "c1" }],
    status: "completed", termsHash: "", acceptance: { creator: null, brand: null }, completion: { creator: null, brand: null },
    tracking: { code: null, destinationUrl: "", clicks: 100, promoCode: "", redemptions: 20 }, invoiceNumber: null, createdAt: "", updatedAt: "",
    ...over,
  } as Deal;
}

describe("trust graph", () => {
  it("counts only two-sided verified deals", () => {
    const r = computeReliability("c1", [deal({ verifiedCompletion: true }), deal({ verifiedCompletion: false })]);
    expect(r.asCreator.verifiedDeals).toBe(1);
    expect(r.asCreator.deliveredOnTime).toBe(1);
    expect(r.asBrand.verifiedDeals).toBe(0);
  });
  it("never invents delivery dates: missing deliveredAt is excluded, not counted as on time", () => {
    const d = deal({ verifiedCompletion: true, deliverables: [{ id: "x", type: "Instagram Reel", qty: 1, dueDate: "2026-11-05", note: "", status: "approved", proofUrl: "" }] });
    expect(computeReliability("c1", [d]).asCreator.deliverablesWithDueDate).toBe(0);
  });
  it("late delivery counts against on-time", () => {
    const d = deal({ verifiedCompletion: true, deliverables: [{ id: "x", type: "Instagram Reel", qty: 1, dueDate: "2026-11-05", note: "", status: "approved", proofUrl: "", deliveredAt: "2026-11-07" }] });
    const r = computeReliability("c1", [d]).asCreator;
    expect([r.deliveredOnTime, r.deliverablesWithDueDate]).toEqual([0, 1]);
  });
  it("brand on-time payment uses the date the fee was fully paid", () => {
    const late = deal({ verifiedCompletion: true, payments: [{ id: "a", amount: 4000, date: "2026-11-01", method: "UPI", note: "", recordedBy: "c1" }, { id: "b", amount: 4000, date: "2026-11-20", method: "UPI", note: "", recordedBy: "c1" }] });
    expect(paidInFullDate(late)).toBe("2026-11-20");
    const r = computeReliability("b1", [late, deal({ verifiedCompletion: true })]).asBrand;
    expect([r.paidOnTime, r.paymentsWithDueDate, r.repeatCreators]).toEqual([1, 2, 1]);
  });
  it("counts repeat clients, including off-platform ones by name", () => {
    const off = (n: string) => deal({ verifiedCompletion: true, brandSide: { uid: null, name: n }, memberUids: ["c1"] });
    const r = computeReliability("c1", [off("Kanha Textiles"), off("kanha textiles "), off("FitHub")]).asCreator;
    expect([r.distinctClients, r.repeatClients]).toEqual([2, 1]);
  });
});

describe("rate & results index", () => {
  const prof = { city: "Allahabad", categories: ["Food & Restaurants"] };
  it("builds a per-unit sample only from completed, paid, single-type deals", () => {
    expect(sampleFromDeal(deal({}), prof)).toMatchObject({ city: "prayagraj", feePerUnit: 4000, costPerCustomer: 400 });
    expect(sampleFromDeal(deal({ status: "active" }), prof)).toBeNull();
    expect(sampleFromDeal(deal({ payments: [] }), prof)).toBeNull();
    expect(sampleFromDeal(deal({ compensationType: "barter", feeAmount: 0 }), prof)).toBeNull();
    const mixed = deal({ deliverables: [
      { id: "a", type: "Instagram Reel", qty: 1, dueDate: "", note: "", status: "approved", proofUrl: "" },
      { id: "b", type: "Instagram Story", qty: 3, dueDate: "", note: "", status: "approved", proofUrl: "" },
    ] });
    expect(sampleFromDeal(mixed, prof)).toBeNull();
  });
  it("suppresses groups below k-anonymity thresholds", () => {
    const mk = (uid: string, fee: number): BenchmarkSample => ({ creatorUid: uid, city: "prayagraj", category: "Food & Restaurants", type: "Instagram Reel", feePerUnit: fee, costPerCustomer: null });
    expect(aggregateBenchmarks([mk("a", 1), mk("a", 2), mk("a", 3), mk("a", 4), mk("a", 5)])).toHaveLength(0); // one creator only
    const ok = aggregateBenchmarks([mk("a", 2000), mk("b", 3000), mk("c", 4000), mk("a", 5000), mk("b", 6000)]);
    expect(ok.map((b) => b.city).sort()).toEqual(["all", "prayagraj"]);
    const city = ok.find((b) => b.city === "prayagraj")!;
    expect([city.feeP25, city.feeMedian, city.feeP75, city.n, city.creators]).toEqual([3000, 4000, 5000, 5, 3]);
    expect(city.cpcMedian).toBeNull();
  });
  it("helpers", () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(3); // 2.5 rounded
    expect(normCity(" Bangalore ")).toBe("bengaluru");
    expect(benchmarkKey("Allahabad", "Food & Restaurants", "Instagram Reel")).toBe(benchmarkKey("prayagraj", "Food & Restaurants", "Instagram Reel"));
    expect(fairness(1000, { feeP25: 2000, feeMedian: 3000, feeP75: 4000 })).toBe("below");
    expect(fairness(3500, { feeP25: 2000, feeMedian: 3000, feeP75: 4000 })).toBe("typical");
  });
});
