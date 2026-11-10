import "server-only";
import { cache } from "react";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { handleSchema } from "@/lib/schemas";
import type { Reliability } from "@/lib/insights";
import { C, profileCollection } from "./collections";
import type { UserDoc } from "./auth";

export type PublicTrustSignal = { type: string; detail: Record<string, string>; at: string | null };

export type PublicPassport = {
  role: UserDoc["role"];
  displayName: string;
  handle: string;
  city: string;
  bio: string;
  categories: string[];
  languages: string[];
  portfolioLinks: string[];
  rateCardNote: string;
  openToPods: boolean;
  industry: string | null;
  website: string | null;
  verifiedBusiness: boolean;
  verifiedPlatforms: string[];
  signals: PublicTrustSignal[];
  memberSince: string | null;
  reliability: Reliability | null;
};

/**
 * Loads ONLY public, non-sensitive fields for an opted-in, active member.
 * Email, phone, business documents and verification codes are never read into this shape.
 */
export const getPublicPassport = cache(async (rawHandle: string): Promise<PublicPassport | null> => {
  const parsed = handleSchema.safeParse(rawHandle);
  if (!parsed.success || !isAdminConfigured()) return null;
  const db = adminDb();
  const h = await db.collection(C.handles).doc(parsed.data).get();
  if (!h.exists) return null;
  const uid = h.get("uid") as string;
  const u = await db.collection(C.users).doc(uid).get();
  if (!u.exists) return null;
  const user = u.data() as UserDoc;
  if (user.status !== "active" || user.handle !== parsed.data) return null;
  const p = await db.collection(profileCollection(user.role)).doc(uid).get();
  if (!p.exists || p.get("isPublic") !== true) return null;
  const prof = p.data()!;
  const rel = await db.collection(C.reliability).doc(uid).get();
  const trust = await db.collection(C.trustSignals).where("uid", "==", uid).where("public", "==", true).limit(50).get();

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

  return {
    role: user.role,
    displayName: str(prof.displayName),
    handle: parsed.data,
    city: str(prof.city),
    bio: str(prof.bio),
    categories: arr(prof.categories),
    languages: arr(prof.languages),
    portfolioLinks: arr(prof.portfolioLinks),
    rateCardNote: str(prof.rateCardNote),
    openToPods: prof.openToPods === true,
    industry: user.role === "brand" ? str(prof.industry) : null,
    website: user.role === "brand" ? str(prof.website) : null,
    verifiedBusiness: prof.verified === true,
    verifiedPlatforms: arr(prof.verifiedPlatforms),
    signals: trust.docs.map((d) => {
      const detail = d.get("detail") ?? {};
      // Only whitelist display-safe detail keys.
      const safe: Record<string, string> = {};
      for (const k of ["platform", "handle", "url", "counterparty", "pod", "role"]) if (typeof detail[k] === "string") safe[k] = detail[k];
      const at = d.get("at");
      return { type: d.get("type") as string, detail: safe, at: at?.toDate ? at.toDate().toISOString() : null };
    }),
    memberSince: user.createdAt?.toDate ? user.createdAt.toDate().toISOString() : null,
    reliability: rel.exists ? ({ asCreator: rel.get("asCreator"), asBrand: rel.get("asBrand") } as Reliability) : null,
  };
});
