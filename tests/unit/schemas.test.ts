import { describe, expect, it } from "vitest";
import { brandVerificationSchema, cleanText, creatorProfileSchema, handleSchema, httpUrl, waitlistSchema } from "@/lib/schemas";

const base = {
  name: "Riya Sharma",
  email: "  Riya@Example.COM ",
  city: "Prayagraj",
  role: "creator",
  category: "Food & Restaurants",
  link: "instagram.com/riya",
  termsAccepted: true,
};

describe("waitlistSchema", () => {
  it("accepts a valid creator and normalises email + link", () => {
    const r = waitlistSchema.parse(base);
    expect(r.email).toBe("riya@example.com");
    expect(r.link).toBe("https://instagram.com/riya");
    expect(r.marketingConsent).toBe(false);
  });

  it("requires terms acceptance", () => {
    expect(waitlistSchema.safeParse({ ...base, termsAccepted: false }).success).toBe(false);
  });

  it("requires a profile link for creators", () => {
    const r = waitlistSchema.safeParse({ ...base, link: "" });
    expect(r.success).toBe(false);
  });

  it("rejects mismatched category for role", () => {
    expect(waitlistSchema.safeParse({ ...base, category: "Restaurant / Café" }).success).toBe(false);
  });

  it("requires an objective for brands but not a link", () => {
    const brand = { ...base, role: "brand", category: "Restaurant / Café", link: "" };
    expect(waitlistSchema.safeParse(brand).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...brand, objective: "Store footfall / visits" }).success).toBe(true);
  });

  it("rejects malformed referral codes", () => {
    expect(waitlistSchema.safeParse({ ...base, ref: "ILOU1234" }).success).toBe(false);
    expect(waitlistSchema.safeParse({ ...base, ref: "7k2qx9md" }).success).toBe(true);
  });

  it("strips control characters from free text", () => {
    const r = waitlistSchema.parse({ ...base, wants: "Brand\u0000 deals\u0007  please" });
    expect(r.wants).toBe("Brand deals please");
  });
});

describe("httpUrl", () => {
  it.each(["javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd", "https://user:pw@example.com", "notaurl"])("rejects %s", (v) => {
    expect(httpUrl.safeParse(v).success).toBe(false);
  });
  it("accepts https", () => expect(httpUrl.parse("https://youtube.com/@x")).toBe("https://youtube.com/@x"));
});

describe("handleSchema", () => {
  it.each(["ab", "-abc", "abc-", "a--b", "Admin", "admin", "has space", "x".repeat(31)])("rejects %s", (h) => {
    expect(handleSchema.safeParse(h).success).toBe(false);
  });
  it("accepts and lowercases", () => expect(handleSchema.parse("Riya-Eats")).toBe("riya-eats"));
});

describe("creatorProfileSchema", () => {
  it("cannot set server-owned fields", () => {
    const r = creatorProfileSchema.parse({
      displayName: "Riya",
      handle: "riya-eats",
      city: "Prayagraj",
      categories: ["Food & Restaurants"],
      verifiedPlatforms: ["instagram"],
      verified: true,
    } as Record<string, unknown>);
    expect("verifiedPlatforms" in r).toBe(false);
    expect("verified" in r).toBe(false);
  });
});

describe("brandVerificationSchema", () => {
  const ok = {
    legalName: "Spice Route Foods Pvt Ltd",
    representativeName: "Aman",
    representativeRole: "Owner",
    businessEmail: "owner@spiceroute.in",
    businessPhone: "+91 98765 43210",
    registeredAddress: "12 Civil Lines, Prayagraj 211001",
  };
  it("accepts empty GSTIN and validates format when present", () => {
    expect(brandVerificationSchema.safeParse(ok).success).toBe(true);
    expect(brandVerificationSchema.safeParse({ ...ok, gstin: "09AAACH7409R1ZZ" }).success).toBe(true);
    expect(brandVerificationSchema.safeParse({ ...ok, gstin: "NOTAGSTIN" }).success).toBe(false);
  });
});

describe("cleanText", () => {
  it("collapses whitespace", () => expect(cleanText("  a \t  b  ")).toBe("a b"));
});

import { registerSchema } from "@/lib/schemas";
describe("registerSchema", () => {
  it("accepts a valid open sign-up", () => {
    const r = registerSchema.parse({ role: "creator", name: "  Riya  ", termsAccepted: true });
    expect(r).toMatchObject({ role: "creator", name: "Riya", city: "", marketingConsent: false });
  });
  it("requires terms and a real role/name", () => {
    expect(registerSchema.safeParse({ role: "creator", name: "Riya", termsAccepted: false }).success).toBe(false);
    expect(registerSchema.safeParse({ role: "admin", name: "Riya", termsAccepted: true }).success).toBe(false);
    expect(registerSchema.safeParse({ role: "brand", name: "R", termsAccepted: true }).success).toBe(false);
  });
});
