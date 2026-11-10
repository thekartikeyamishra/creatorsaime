import type { Role } from "@/lib/config";

export type Member = {
  uid: string;
  role: Role;
  email: string;
  displayName: string;
  handle: string;
  status: "active" | "suspended";
  marketingConsent?: boolean;
  emailDigest?: boolean;
  createdAt: string;
};

export type CreatorProfile = {
  uid: string;
  kind: "creator" | "professional";
  displayName: string;
  handle: string;
  bio: string;
  city: string;
  categories: string[];
  languages: string[];
  portfolioLinks: string[];
  rateCardNote: string;
  openToPods: boolean;
  isPublic: boolean;
  verifiedPlatforms: string[];
};

export type BrandProfile = {
  uid: string;
  displayName: string;
  handle: string;
  bio: string;
  city: string;
  industry: string;
  website: string;
  isPublic: boolean;
  verified: boolean;
};

export type Me = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
  member: Member | null;
  profile: CreatorProfile | BrandProfile | null;
};
