/**
 * Identifier generation. Uses the Web Crypto CSPRNG (available in Node 22 and browsers).
 */

/** Crockford base32 — no I, L, O, U to avoid confusion when read aloud or typed. */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

/** 8-char referral code, e.g. "7K2QX9MD". 32^8 ≈ 1.1e12 space. Unbiased (32 divides 256). */
export function generateReferralCode(): string {
  return Array.from(randomBytes(8), (b) => CROCKFORD[b % 32]).join("");
}

/** 32-byte URL-safe secret for single-use invites. Only its hash is stored. */
export function generateInviteCode(): string {
  return Buffer.from(randomBytes(32)).toString("base64url");
}

/** Verification code a creator places in their bio to prove account ownership. */
export function generateVerificationCode(): string {
  return `CAI-${Array.from(randomBytes(6), (b) => CROCKFORD[b % 32]).join("")}`;
}

/** Turn a display name into a handle candidate: "Riya Sharma!" -> "riya-sharma". */
export function slugifyHandle(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 22)
    .replace(/-+$/g, "");
  const suffix = Array.from(randomBytes(3), (b) => CROCKFORD[b % 32]).join("").toLowerCase();
  return `${base.length >= 2 ? base : "creator"}-${suffix}`;
}

const ALNUM = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Opaque short id for sub-items (deliverables, payments). */
export function shortId(len = 12): string {
  // 57-char alphabet: reject-sample to stay unbiased.
  const out: string[] = [];
  while (out.length < len) {
    for (const b of randomBytes(len * 2)) {
      if (b < 228 && out.length < len) out.push(ALNUM[b % 57]!);
    }
  }
  return out.join("");
}

/** 7-char tracking-link code, e.g. /r/K7Q2XMD. */
export function trackingCode(): string {
  return Array.from(randomBytes(7), (b) => CROCKFORD[b % 32]).join("");
}
