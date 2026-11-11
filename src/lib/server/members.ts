import "server-only";
import { FieldValue, Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";
import { CREATOR_CATEGORIES, POLICY_VERSION, PROFESSIONAL_SKILLS, SCHEMA_VERSION, type Role } from "@/lib/config";
import { slugifyHandle } from "@/lib/ids";
import { C, profileCollection } from "./collections";

export type NewMember = {
  uid: string;
  email: string;
  name: string;
  role: Role;
  city: string;
  category?: string;
  link?: string;
  languages?: string[];
  marketingConsent: boolean;
  waitlistId: string | null;
  joinedVia: "invite" | "open" | "script";
};

/**
 * Creates the user document, a unique public handle and an empty (private) profile inside a transaction.
 * All reads happen first, as Firestore transactions require. Callers must check the user doesn't exist yet.
 */
export async function createMemberInTx(tx: Transaction, db: Firestore, m: NewMember): Promise<{ handle: string }> {
  const candidates = Array.from({ length: 4 }, () => slugifyHandle(m.name));
  const snaps = await Promise.all(candidates.map((h) => tx.get(db.collection(C.handles).doc(h))));
  const idx = snaps.findIndex((s) => !s.exists);
  if (idx === -1) throw new Error("Could not allocate handle");
  const handle = candidates[idx]!;

  const now = FieldValue.serverTimestamp();
  tx.create(db.collection(C.users).doc(m.uid), {
    uid: m.uid,
    role: m.role,
    email: m.email,
    displayName: m.name,
    handle,
    status: "active",
    waitlistId: m.waitlistId,
    joinedVia: m.joinedVia,
    marketingConsent: m.marketingConsent,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  });
  tx.create(db.collection(C.handles).doc(handle), { uid: m.uid, createdAt: now });

  if (m.role === "brand") {
    tx.create(db.collection(profileCollection("brand")).doc(m.uid), {
      uid: m.uid,
      displayName: m.name,
      handle,
      bio: "",
      city: m.city,
      industry: m.category || "Other",
      website: m.link ?? "",
      isPublic: false,
      verified: false,
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
  } else {
    const valid = m.category && ([...CREATOR_CATEGORIES, ...PROFESSIONAL_SKILLS] as readonly string[]).includes(m.category);
    tx.create(db.collection(profileCollection(m.role)).doc(m.uid), {
      uid: m.uid,
      kind: m.role,
      displayName: m.name,
      handle,
      bio: "",
      city: m.city,
      categories: valid ? [m.category] : [],
      languages: m.languages ?? [],
      portfolioLinks: m.link ? [m.link] : [],
      rateCardNote: "",
      openToPods: true,
      isPublic: false,
      verifiedPlatforms: [],
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
  }
  return { handle };
}

/** Consent records (DPDP): terms/privacy and marketing, versioned. */
export function recordConsentInTx(tx: Transaction, db: Firestore, uid: string, marketing: boolean, source: string): void {
  const base = { subjectType: "user", subjectId: uid, uid, policyVersion: POLICY_VERSION, source, at: Timestamp.now() };
  tx.create(db.collection(C.consentRecords).doc(), { ...base, purpose: "terms_and_privacy", granted: true });
  tx.create(db.collection(C.consentRecords).doc(), { ...base, purpose: "marketing", granted: marketing });
}
