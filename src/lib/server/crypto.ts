import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { ServiceUnavailableError } from "@/lib/firebase/admin";

function salt(): string {
  const s = process.env.HASH_SALT;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new ServiceUnavailableError("HASH_SALT must be set (16+ chars) in production");
    }
    return "dev-only-insecure-salt";
  }
  return s;
}

/** Keyed hash for PII lookups (email dedupe, IP rate-limit keys). Not reversible without the salt. */
export function keyedHash(value: string): string {
  return createHmac("sha256", salt()).update(value).digest("hex");
}

/** Plain SHA-256 for high-entropy secrets (invite codes). */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
