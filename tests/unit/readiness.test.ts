import { describe, expect, it } from "vitest";
import { buildPreview, detectPlatform, isCohortCity, suggestPod } from "@/lib/readiness";
import { waitlistSchema } from "@/lib/schemas";

describe("detectPlatform", () => {
  it.each([
    ["https://www.instagram.com/x", "instagram"],
    ["https://youtu.be/abc", "youtube"],
    ["https://m.youtube.com/@x", "youtube"],
    ["https://twitter.com/x", "x"],
    ["https://in.linkedin.com/in/x", "linkedin"],
    ["https://example.com", "other"],
    ["https://evilinstagram.com/x", "other"],
  ])("%s -> %s", (url, p) => expect(detectPlatform(url)).toBe(p));
  it("handles empty", () => expect(detectPlatform("")).toBeNull());
});

describe("isCohortCity", () => {
  it("matches aliases case-insensitively", () => {
    expect(isCohortCity("allahabad")).toBe(true);
    expect(isCohortCity(" Hyderabad ")).toBe(true);
    expect(isCohortCity("Pune")).toBe(false);
  });
});

describe("suggestPod", () => {
  it("never returns duplicate roles", () => {
    const pod = suggestPod("Technology / App", "App installs / sign-ups");
    expect(new Set(pod.map((p) => p.role)).size).toBe(pod.length);
  });
  it("starts with the industry-relevant creator", () => {
    expect(suggestPod("Restaurant / Café", "Store footfall / visits")[0]!.role).toBe("Food & Restaurants creator");
  });
});

describe("buildPreview", () => {
  it("is honest that no campaigns are live for creators", () => {
    const p = buildPreview(
      waitlistSchema.parse({ name: "Riya", email: "r@x.in", city: "Pune", role: "creator", category: "Travel", link: "https://instagram.com/r", termsAccepted: true }),
    );
    expect(p.kind).toBe("creator");
    expect(p.honestStatus).toMatch(/no live campaigns/i);
    expect(JSON.stringify(p)).not.toMatch(/score/i);
  });
  it("builds a brand pod preview", () => {
    const p = buildPreview(
      waitlistSchema.parse({ name: "Aman", email: "a@x.in", city: "Prayagraj", role: "brand", category: "Restaurant / Café", objective: "Store footfall / visits", termsAccepted: true }),
    );
    expect(p.kind).toBe("brand");
    if (p.kind === "brand") {
      expect(p.inCohortCity).toBe(true);
      expect(p.suggestedPod.length).toBeGreaterThanOrEqual(2);
    }
  });
});
