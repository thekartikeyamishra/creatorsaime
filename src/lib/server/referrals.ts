import "server-only";
import { randomInt } from "node:crypto";
import { FieldValue, Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { SCHEMA_VERSION, type Role } from "@/lib/config";
import { extendExpiry } from "@/lib/plans";
import { ambassadorLevel, decideReward, newRefCode, qualifyEventFor, REF_CODE_RE, REFERRAL, type QualifyEvent } from "@/lib/referrals";
import { auditIn } from "./audit";
import { C } from "./collections";
import { notifyIn } from "./notify";

const rand = () => randomInt(0, 1_000_000) / 1_000_000;

/** Reads the referral code remembered by /r/[code] (first-party, httpOnly cookie). */
export function refCodeFromRequest(req: Request): string | null {
  const m = /(?:^|;\s*)cai_ref=([a-z0-9]{8})(?:;|$)/.exec(req.headers.get("cookie") ?? "");
  return m && REF_CODE_RE.test(m[1]!) ? m[1]! : null;
}

export const clearRefCookie = `${REFERRAL.cookie}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

/** Returns the member's referral code, creating it once (unique, collision-checked). */
export async function getOrCreateRefCode(uid: string): Promise<string> {
  const db = adminDb();
  const userRef = db.collection(C.users).doc(uid);
  return db.runTransaction(async (tx) => {
    const user = await tx.get(userRef);
    const existing = user.get("refCode") as string | undefined;
    if (existing) return existing;
    const candidates = Array.from({ length: 4 }, () => newRefCode(rand));
    const snaps = await Promise.all(candidates.map((c) => tx.get(db.collection(C.memberRefCodes).doc(c))));
    const i = snaps.findIndex((s) => !s.exists);
    if (i === -1) throw new Error("Could not allocate referral code");
    const code = candidates[i]!;
    tx.create(db.collection(C.memberRefCodes).doc(code), { uid, createdAt: FieldValue.serverTimestamp() });
    tx.update(userRef, { refCode: code, updatedAt: FieldValue.serverTimestamp() });
    return code;
  });
}

export type Attribution = { referrerUid: string; code: string; trial: boolean } | null;

/**
 * READ phase of attribution, to run at the top of the sign-up transaction (Firestore requires all
 * reads before writes). Self-referral and unknown/inactive referrers are ignored silently.
 */
export async function readAttribution(tx: Transaction, db: Firestore, code: string | null, referredUid: string, referredRole: Role): Promise<Attribution> {
  if (!code) return null;
  const codeSnap = await tx.get(db.collection(C.memberRefCodes).doc(code));
  const referrerUid = codeSnap.exists ? (codeSnap.get("uid") as string) : null;
  if (!referrerUid || referrerUid === referredUid) return null;
  const [referrer, prior, sub] = await Promise.all([
    tx.get(db.collection(C.users).doc(referrerUid)),
    tx.get(db.collection(C.referrals).doc(referredUid)),
    referredRole === "brand" ? tx.get(db.collection(C.subscriptions).doc(referredUid)) : Promise.resolve(null),
  ]);
  if (!referrer.exists || referrer.get("status") !== "active" || prior.exists) return null;
  return { referrerUid, code, trial: referredRole === "brand" && !(sub && sub.exists) };
}

/** WRITE phase: records the referral, grants a referred brand its trial, tells the referrer. */
export function writeAttribution(tx: Transaction, db: Firestore, a: Attribution, referredUid: string, referredRole: Role, referredName: string): void {
  if (!a) return;
  const now = FieldValue.serverTimestamp();
  tx.create(db.collection(C.referrals).doc(referredUid), {
    referredUid,
    referredRole,
    referrerUid: a.referrerUid,
    code: a.code,
    status: "joined",
    event: qualifyEventFor(referredRole),
    trialDays: a.trial ? REFERRAL.brandTrialDays : 0,
    createdAt: now,
    qualifiedAt: null,
    schemaVersion: SCHEMA_VERSION,
  });
  tx.set(db.collection(C.referralStats).doc(a.referrerUid), { uid: a.referrerUid, joined: FieldValue.increment(1), updatedAt: now }, { merge: true });
  if (a.trial) {
    tx.set(db.collection(C.subscriptions).doc(referredUid), {
      uid: referredUid,
      tier: "growth",
      trial: true,
      expiresAt: Timestamp.fromMillis(Date.now() + REFERRAL.brandTrialDays * 86_400_000),
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
  }
  notifyIn(tx, a.referrerUid, {
    type: "referral_joined",
    title: `${referredName} joined with your link`,
    body: referredRole === "brand" ? "You'll earn a reward when they make their first payment." : "You'll earn a reward when they complete their first verified deal.",
    href: "/dashboard/referrals",
  });
}

/** Has the referred member done the real thing yet? (outside the transaction — cheap, indexed reads) */
async function eventHappened(db: Firestore, referredUid: string, event: QualifyEvent): Promise<boolean> {
  if (event === "brand_first_payment") {
    const q = await db.collection(C.orders).where("uid", "==", referredUid).where("status", "==", "paid").limit(1).get();
    return !q.empty;
  }
  const q = await db.collection(C.trustSignals).where("uid", "==", referredUid).where("type", "in", ["collaboration_completed_verified", "collaboration_confirmed_by_client"]).limit(1).get();
  return !q.empty;
}

/**
 * Idempotent: qualifies one referral and rewards the referrer exactly once. Safe to call from the
 * payment flow, the daily job, or anywhere else — repeated calls change nothing.
 */
export async function qualifyReferral(referredUid: string): Promise<"qualified" | "skipped"> {
  const db = adminDb();
  const refRef = db.collection(C.referrals).doc(referredUid);
  const pre = await refRef.get();
  if (!pre.exists || pre.get("status") !== "joined") return "skipped";
  const event = pre.get("event") as QualifyEvent;
  if (!(await eventHappened(db, referredUid, event))) return "skipped";

  return db.runTransaction(async (tx) => {
    const r = await tx.get(refRef);
    if (!r.exists || r.get("status") !== "joined") return "skipped" as const;
    const referrerUid = r.get("referrerUid") as string;
    const [referrer, stats, sub] = await Promise.all([
      tx.get(db.collection(C.users).doc(referrerUid)),
      tx.get(db.collection(C.referralStats).doc(referrerUid)),
      tx.get(db.collection(C.subscriptions).doc(referrerUid)),
    ]);
    const year = new Date().getUTCFullYear();
    const rewardsThisYear = stats.get("rewardYear") === year ? ((stats.get("rewardsThisYear") as number) ?? 0) : 0;
    const role = (referrer.get("role") as Role | undefined) ?? "creator";
    const active = referrer.exists && referrer.get("status") === "active";
    const decision = active ? decideReward(role, event, rewardsThisYear) : { rewarded: false, growthDays: 0, reason: "yearly_cap" as const };
    const qualified = ((stats.get("qualified") as number) ?? 0) + 1;
    const now = FieldValue.serverTimestamp();

    tx.update(refRef, { status: "qualified", qualifiedAt: now, rewarded: decision.rewarded, rewardGrowthDays: decision.growthDays });
    tx.set(
      db.collection(C.referralStats).doc(referrerUid),
      {
        uid: referrerUid,
        qualified,
        ambassadorLevel: ambassadorLevel(qualified).level,
        rewardYear: year,
        rewardsThisYear: rewardsThisYear + (decision.rewarded ? 1 : 0),
        growthDaysEarned: FieldValue.increment(decision.growthDays),
        updatedAt: now,
      },
      { merge: true },
    );
    if (decision.growthDays > 0) {
      const current = sub.exists ? ((sub.get("expiresAt") as Timestamp | undefined)?.toMillis() ?? null) : null;
      tx.set(db.collection(C.subscriptions).doc(referrerUid), { uid: referrerUid, tier: "growth", expiresAt: Timestamp.fromMillis(extendExpiry(current, decision.growthDays)), updatedAt: now, schemaVersion: SCHEMA_VERSION }, { merge: true });
    }
    if (active) {
      const lvl = ambassadorLevel(qualified);
      notifyIn(tx, referrerUid, {
        type: "referral_rewarded",
        title: decision.growthDays > 0 ? `+${decision.growthDays} days of Growth earned` : lvl.title ? `You're a CreatorsAI ${lvl.title}` : "Referral qualified",
        body: decision.rewarded ? "Someone you invited just had their first real result on CreatorsAI. Thank you!" : "This referral counts toward your Ambassador level (yearly reward limit reached).",
        href: "/dashboard/referrals",
      });
    }
    auditIn(tx, { actorUid: "system", actorRole: "system", action: "referral.qualified", targetType: "user", targetId: referredUid, meta: { referrerUid, event, ...decision } });
    return "qualified" as const;
  });
}

/** Daily backstop: qualify any pending referrals whose event has happened. Bounded per run. */
export async function qualifyPendingReferrals(limit = 200): Promise<number> {
  const snap = await adminDb().collection(C.referrals).where("status", "==", "joined").limit(limit).get();
  let n = 0;
  for (const d of snap.docs) {
    try {
      if ((await qualifyReferral(d.id)) === "qualified") n++;
    } catch (err) {
      console.error("[referrals] qualify failed", d.id, err);
    }
  }
  return n;
}
