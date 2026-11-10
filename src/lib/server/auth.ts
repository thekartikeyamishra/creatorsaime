import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { Role } from "@/lib/config";
import { ApiError } from "./http";

export type UserDoc = {
  uid: string;
  role: Role;
  email: string;
  displayName: string;
  handle: string;
  status: "active" | "suspended";
  waitlistId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;
  marketingConsent?: boolean;
};

export type AuthContext = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  isAdmin: boolean;
  token: DecodedIdToken;
};

export type MemberContext = AuthContext & { user: UserDoc };

function bearer(req: Request): string {
  const h = req.headers.get("authorization") || "";
  const m = /^Bearer\s+([A-Za-z0-9._-]+)$/.exec(h);
  if (!m) throw new ApiError(401, "unauthenticated", "Please sign in");
  return m[1]!;
}

/** Verifies the Firebase ID token (including revocation). Any signed-in Firebase user. */
export async function requireAuth(req: Request): Promise<AuthContext> {
  const raw = bearer(req);
  let token: DecodedIdToken;
  try {
    token = await adminAuth().verifyIdToken(raw, true);
  } catch {
    throw new ApiError(401, "unauthenticated", "Your session has expired. Please sign in again.");
  }
  return {
    uid: token.uid,
    email: token.email ?? null,
    emailVerified: token.email_verified === true,
    isAdmin: token.admin === true,
    token,
  };
}

/** A signed-in user who has redeemed an invite and is not suspended. */
export async function requireMember(req: Request): Promise<MemberContext> {
  const ctx = await requireAuth(req);
  const snap = await adminDb().collection("users").doc(ctx.uid).get();
  if (!snap.exists) throw new ApiError(403, "not_a_member", "Your account needs an invite to continue.");
  const user = snap.data() as UserDoc;
  if (user.status !== "active") throw new ApiError(403, "account_suspended", "This account is suspended. Contact support.");
  return { ...ctx, user };
}

/**
 * Admin: custom claim `admin: true` (set only via scripts/set-admin.mjs).
 * When ADMIN_REQUIRE_MFA=true, the session must have been completed with a second factor.
 */
export async function requireAdmin(req: Request): Promise<AuthContext> {
  const ctx = await requireAuth(req);
  if (!ctx.isAdmin) throw new ApiError(403, "forbidden", "Admin access required");
  if (process.env.ADMIN_REQUIRE_MFA === "true" && !ctx.token.firebase?.sign_in_second_factor) {
    throw new ApiError(403, "mfa_required", "Admin access requires multi-factor authentication");
  }
  return ctx;
}
