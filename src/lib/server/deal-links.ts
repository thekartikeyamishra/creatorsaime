import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import type { Side } from "@/lib/deals";
import { C } from "./collections";
import { sha256 } from "./crypto";
import type { DealDoc } from "./deals";

export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** Resolves a private counterparty link. Returns null for invalid, expired or revoked links. */
export async function resolveDealLink(token: string): Promise<{ dealId: string; side: Side; deal: DealDoc; linkHash: string } | null> {
  if (!TOKEN_RE.test(token) || !isAdminConfigured()) return null;
  const db = adminDb();
  const hash = sha256(token);
  const link = await db.collection(C.dealLinks).doc(hash).get();
  if (!link.exists) return null;
  const expiresAt = link.get("expiresAt") as Timestamp | undefined;
  if (!expiresAt || expiresAt.toMillis() < Date.now()) return null;
  const dealId = link.get("dealId") as string;
  const deal = await db.collection(C.deals).doc(dealId).get();
  if (!deal.exists) return null;
  const d = deal.data() as DealDoc;
  if (d.shareLinkHash !== hash) return null; // superseded by a newer link
  return { dealId, side: link.get("side") as Side, deal: d, linkHash: hash };
}
