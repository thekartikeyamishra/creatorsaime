import type { BrandProfile, CreatorProfile } from "./client/types";

export type ChecklistItem = { key: string; label: string; done: boolean; href: string };

/** Transparent, rule-based checklist — what's done and what's next. No hidden scoring. */
export function profileChecklist(role: "creator" | "professional" | "brand", profile: CreatorProfile | BrandProfile | null): ChecklistItem[] {
  if (!profile) return [];
  if (role === "brand") {
    const p = profile as BrandProfile;
    return [
      { key: "bio", label: "Describe your business", done: p.bio.trim().length >= 30, href: "/dashboard/profile" },
      { key: "website", label: "Add your website or social page", done: Boolean(p.website), href: "/dashboard/profile" },
      { key: "verified", label: "Verify your business", done: p.verified, href: "/dashboard/verification" },
    ];
  }
  const p = profile as CreatorProfile;
  return [
    { key: "bio", label: "Write a short bio", done: p.bio.trim().length >= 30, href: "/dashboard/profile" },
    { key: "categories", label: "Choose your categories", done: p.categories.length > 0, href: "/dashboard/profile" },
    { key: "languages", label: "Add your content languages", done: p.languages.length > 0, href: "/dashboard/profile" },
    { key: "portfolio", label: "Add portfolio links", done: p.portfolioLinks.length > 0, href: "/dashboard/profile" },
    { key: "verified", label: "Verify a social account", done: p.verifiedPlatforms.length > 0, href: "/dashboard/verification" },
    { key: "public", label: "Publish your Trust Passport", done: p.isPublic, href: "/dashboard/profile" },
  ];
}
