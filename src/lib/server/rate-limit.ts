import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { keyedHash } from "./crypto";
import { ApiError } from "./http";

/**
 * Fixed-window rate limiter backed by Firestore — no Redis needed at this stage.
 * Docs in `rateLimits` carry `expiresAt`; enable a Firestore TTL policy on that field
 * (see docs/DEPLOYMENT.md) so old windows are deleted automatically.
 */
export type RateLimitRule = { bucket: string; limit: number; windowSeconds: number };

export const RULES = {
  waitlistPerIp: { bucket: "waitlist-ip", limit: 5, windowSeconds: 3600 },
  redeemPerUser: { bucket: "redeem-user", limit: 10, windowSeconds: 3600 },
  writePerUser: { bucket: "write-user", limit: 60, windowSeconds: 600 },
  verificationPerUser: { bucket: "verify-user", limit: 10, windowSeconds: 86400 },
  dataRequestPerUser: { bucket: "data-request-user", limit: 5, windowSeconds: 86400 },
} as const satisfies Record<string, RateLimitRule>;

export function windowStart(nowMs: number, windowSeconds: number): number {
  const w = windowSeconds * 1000;
  return Math.floor(nowMs / w) * w;
}

export async function enforceRateLimit(rule: RateLimitRule, subject: string): Promise<void> {
  const now = Date.now();
  const start = windowStart(now, rule.windowSeconds);
  const id = keyedHash(`${rule.bucket}:${subject}:${start}`).slice(0, 40);
  const ref = adminDb().collection("rateLimits").doc(id);

  const allowed = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = (snap.exists ? (snap.get("count") as number) : 0) + 1;
    if (count > rule.limit) return false;
    tx.set(ref, {
      bucket: rule.bucket,
      count,
      windowStart: Timestamp.fromMillis(start),
      expiresAt: Timestamp.fromMillis(start + rule.windowSeconds * 1000 * 2),
    });
    return true;
  });

  if (!allowed) {
    throw new ApiError(429, "rate_limited", "Too many requests. Please wait a while and try again.");
  }
}
