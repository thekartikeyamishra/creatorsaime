import { describe, expect, it } from "vitest";
import { safeNext } from "@/components/auth-errors";
import { generateInviteCode, generateReferralCode, generateVerificationCode, slugifyHandle } from "@/lib/ids";
import { profileChecklist } from "@/lib/profile";
import { handleSchema, referralCodeSchema } from "@/lib/schemas";
import { windowStart } from "@/lib/server/rate-limit";

describe("ids", () => {
  it("referral codes are valid and unique-ish", () => {
    const codes = new Set(Array.from({ length: 2000 }, generateReferralCode));
    expect(codes.size).toBe(2000);
    for (const c of codes) expect(referralCodeSchema.safeParse(c).success).toBe(true);
  });
  it("invite codes are 43-char base64url", () => {
    expect(generateInviteCode()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
  it("verification codes have the CAI prefix", () => expect(generateVerificationCode()).toMatch(/^CAI-[0-9A-Z]{6}$/));
  it.each(["Riya Sharma!", "ज्योति", "  ", "Émile Zola the Great Storyteller of France"])("slugifyHandle(%s) is a valid handle", (n) => {
    expect(handleSchema.safeParse(slugifyHandle(n)).success).toBe(true);
  });
});

describe("safeNext", () => {
  it.each([
    [null, "/dashboard"],
    ["/admin", "/admin"],
    ["//evil.com", "/dashboard"],
    ["/\\evil.com", "/dashboard"],
    ["https://evil.com", "/dashboard"],
  ])("%s -> %s", (input, out) => expect(safeNext(input)).toBe(out));
});

describe("rate limit window", () => {
  it("aligns to window boundaries", () => {
    expect(windowStart(3_599_999, 3600)).toBe(0);
    expect(windowStart(3_600_000, 3600)).toBe(3_600_000);
  });
});

describe("profileChecklist", () => {
  it("tracks brand verification", () => {
    const items = profileChecklist("brand", { uid: "u", displayName: "B", handle: "b-1", bio: "", city: "X", industry: "Other", website: "", isPublic: false, verified: true });
    expect(items.find((i) => i.key === "verified")?.done).toBe(true);
  });
  it("empty without profile", () => expect(profileChecklist("creator", null)).toEqual([]));
});
