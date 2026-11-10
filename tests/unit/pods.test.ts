import { describe, expect, it } from "vitest";
import type { Deal } from "@/lib/deals";
import { computeReliability, sampleFromDeal } from "@/lib/insights";
import { payoutLines, sharesValid, splitAmount, type DealPod } from "@/lib/pods";
import { podActionSchema } from "@/lib/schemas";

const pod: DealPod = {
  podId: "p1",
  name: "Sangam Food Crew",
  leadUid: "lead",
  members: [
    { uid: "lead", name: "Riya", role: "Lead creator", sharePct: 50 },
    { uid: "ph", name: "Dev", role: "Photographer", sharePct: 30 },
    { uid: "vid", name: "Sana", role: "Videographer", sharePct: 20 },
  ],
};

describe("shares", () => {
  it("must be whole, positive and sum to exactly 100", () => {
    expect(sharesValid(pod.members)).toBe(true);
    expect(sharesValid([{ sharePct: 50 }, { sharePct: 49 }])).toBe(false);
    expect(sharesValid([{ sharePct: 100.5 }])).toBe(false);
    expect(sharesValid([])).toBe(false);
  });
  it("splits exactly to the rupee", () => {
    const s = splitAmount(10001, [{ uid: "a", sharePct: 33 }, { uid: "b", sharePct: 33 }, { uid: "c", sharePct: 34 }]);
    expect(Object.values(s).reduce((x, y) => x + y, 0)).toBe(10001);
    expect(splitAmount(0, pod.members)).toEqual({ lead: 0, ph: 0, vid: 0 });
  });
});

describe("payout lines", () => {
  it("members are owed their share of what the brand has paid so far", () => {
    const lines = payoutLines(pod, 20000, 10000, [{ id: "x", toUid: "ph", amount: 1000, date: "2026-11-10", method: "UPI", note: "", confirmedAt: null }]);
    const ph = lines.find((l) => l.uid === "ph")!;
    expect([ph.entitledOnFee, ph.entitledSoFar, ph.paidOut, ph.owedNow, ph.confirmed]).toEqual([6000, 3000, 1000, 2000, 0]);
    const lead = lines.find((l) => l.uid === "lead")!;
    expect(lead.owedNow).toBe(0); // lead keeps own share
  });
  it("caps 'so far' at the fee even if overpaid", () => {
    const vid = payoutLines(pod, 10000, 15000, []).find((l) => l.uid === "vid")!;
    expect(vid.entitledSoFar).toBe(2000);
  });
});

function podDeal(): Deal {
  return {
    id: "d", title: "Brunch", source: "campaign", campaignId: "c", createdBy: "b1",
    creatorSide: { uid: "lead", name: "Sangam Food Crew" }, brandSide: { uid: "b1", name: "Spice" }, memberUids: ["b1", "lead", "ph", "vid"],
    deliverables: [
      { id: "a", type: "Instagram Reel", qty: 1, dueDate: "2026-11-05", note: "", status: "approved", proofUrl: "", deliveredAt: "2026-11-04" },
      { id: "b", type: "Photo Shoot", qty: 1, dueDate: "2026-11-05", note: "", status: "approved", proofUrl: "", deliveredAt: "2026-11-06", assigneeUid: "ph" },
    ],
    compensationType: "paid", feeAmount: 20000, paymentTerms: "", paymentDueDate: "", usageRights: "", revisionLimit: 2,
    payments: [{ id: "p", amount: 20000, date: "2026-11-09", method: "UPI", note: "", recordedBy: "lead" }],
    status: "completed", termsHash: "", acceptance: { creator: null, brand: null }, completion: { creator: null, brand: null },
    tracking: { code: null, destinationUrl: "", clicks: 0, promoCode: "", redemptions: 0 }, invoiceNumber: null, createdAt: "", updatedAt: "",
    pod, payouts: [], ...({ verifiedCompletion: true } as object),
  } as Deal;
}

describe("pod credit", () => {
  it("each member is accountable only for their assigned work; unassigned work belongs to the lead", () => {
    const d = podDeal();
    const lead = computeReliability("lead", [d]).asCreator;
    const ph = computeReliability("ph", [d]).asCreator;
    const vid = computeReliability("vid", [d]).asCreator;
    expect([lead.verifiedDeals, lead.deliveredOnTime, lead.deliverablesWithDueDate]).toEqual([1, 1, 1]);
    expect([ph.verifiedDeals, ph.deliveredOnTime, ph.deliverablesWithDueDate]).toEqual([1, 0, 1]);
    expect([vid.verifiedDeals, vid.deliverablesWithDueDate]).toEqual([1, 0]);
  });
  it("pod deals are excluded from per-unit rate benchmarks", () => {
    expect(sampleFromDeal(podDeal(), { city: "Prayagraj", categories: ["Food & Restaurants"] })).toBeNull();
  });
});

describe("pod actions schema", () => {
  it("validates invites and rejects bad shares", () => {
    expect(podActionSchema.safeParse({ action: "invite", handle: "dev-photos", role: "Photographer", sharePct: 30 }).success).toBe(true);
    expect(podActionSchema.safeParse({ action: "invite", handle: "Dev Photos!", role: "Photographer", sharePct: 30 }).success).toBe(false);
    expect(podActionSchema.safeParse({ action: "invite", handle: "dev-photos", role: "Photographer", sharePct: 0 }).success).toBe(false);
    expect(podActionSchema.safeParse({ action: "make_me_lead" }).success).toBe(false);
  });
});
