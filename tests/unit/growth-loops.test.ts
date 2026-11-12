import { describe, expect, it } from "vitest";
import { ambassadorLevel, decideReward, newRefCode, qualifyEventFor, REF_CODE_RE, REFERRAL } from "@/lib/referrals";
import { cleanReviewText, revealAtMs, summarize, validTags, REVIEW_REVEAL_DAYS } from "@/lib/reviews";
import { renewalStage } from "@/lib/plans";

describe("referral rules", () => {
  it("makes readable 8-char codes", () => {
    for (let i = 0; i < 50; i++) expect(newRefCode()).toMatch(REF_CODE_RE);
    expect(newRefCode(() => 0)).toBe("aaaaaaaa");
  });
  it("qualifies brands on first payment and creators on first verified deal", () => {
    expect(qualifyEventFor("brand")).toBe("brand_first_payment");
    expect(qualifyEventFor("creator")).toBe("creator_first_verified_deal");
    expect(qualifyEventFor("professional")).toBe("creator_first_verified_deal");
  });
  it("rewards brand referrers with Growth days, creators with Ambassador progress, capped yearly", () => {
    expect(decideReward("brand", "brand_first_payment", 0)).toEqual({ rewarded: true, growthDays: 30, reason: "ok" });
    expect(decideReward("brand", "creator_first_verified_deal", 3).growthDays).toBe(15);
    expect(decideReward("creator", "brand_first_payment", 0)).toEqual({ rewarded: true, growthDays: 0, reason: "not_brand_referrer" });
    expect(decideReward("brand", "brand_first_payment", REFERRAL.maxRewardsPerYear)).toEqual({ rewarded: false, growthDays: 0, reason: "yearly_cap" });
  });
  it("assigns Ambassador levels", () => {
    expect(ambassadorLevel(0).title).toBeNull();
    expect(ambassadorLevel(1).title).toBe("Ambassador");
    expect(ambassadorLevel(3).title).toBe("Community Builder");
    expect(ambassadorLevel(12)).toMatchObject({ level: 3, title: "Founding Ambassador", next: null });
  });
});

describe("review rules", () => {
  it("rejects links and contact details", () => {
    expect(cleanReviewText("Great work, see www.spam.com").ok).toBe(false);
    expect(cleanReviewText("Call me on +91 98765 43210").ok).toBe(false);
    expect(cleanReviewText("mail a@b.co").ok).toBe(false);
    expect(cleanReviewText("  Delivered   early, lovely Reel!  ")).toEqual({ ok: true, text: "Delivered early, lovely Reel!" });
  });
  it("keeps only allowed tags, max 3", () => {
    expect(validTags("creator", ["Delivered on time", "Paid on time", "Great content", "Drove results", "Easy to work with"])).toEqual(["Delivered on time", "Great content", "Drove results"]);
  });
  it("is double-blind", () => {
    expect(revealAtMs(1000, true)).toBe(1000);
    expect(revealAtMs(1000, false)).toBe(1000 + REVIEW_REVEAL_DAYS * 86_400_000);
  });
  it("summarizes ratings and tags", () => {
    const s = summarize([{ rating: 5, tags: ["Paid on time"] }, { rating: 4, tags: ["Paid on time", "Clear brief"] }]);
    expect(s).toEqual({ count: 2, average: 4.5, topTags: [{ tag: "Paid on time", count: 2 }, { tag: "Clear brief", count: 1 }] });
    expect(summarize([]).average).toBeNull();
  });
});

describe("renewal reminders", () => {
  const day = 86_400_000, now = 1_800_000_000_000;
  it("fires once each at 7 days, 1 day and the end day", () => {
    expect(renewalStage(now + 6.5 * day, now)).toBe("d7");
    expect(renewalStage(now + 0.5 * day, now)).toBe("d1");
    expect(renewalStage(now - 0.5 * day, now)).toBe("ended");
    expect(renewalStage(now + 3 * day, now)).toBeNull();
    expect(renewalStage(now - 2 * day, now)).toBeNull();
  });
});
