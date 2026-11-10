/**
 * Creator Pods — small verified teams that take on one campaign together.
 * Pure helpers shared by client, server and tests. Money in whole rupees.
 */
export const POD_LIMITS = { maxMembers: 8, minActiveToApply: 2, maxPodsLed: 5 } as const;

export type PodMember = {
  uid: string;
  displayName: string;
  handle: string;
  role: string;
  sharePct: number;
  status: "active" | "invited";
};

export type DealPod = {
  podId: string;
  name: string;
  leadUid: string;
  members: Array<{ uid: string; name: string; role: string; sharePct: number }>;
};

export type Payout = { id: string; toUid: string; amount: number; date: string; method: string; note: string; confirmedAt: string | null };

export function activeMembers(members: PodMember[]): PodMember[] {
  return members.filter((m) => m.status === "active");
}

export function sharesValid(members: Array<{ sharePct: number }>): boolean {
  if (members.length === 0) return false;
  const sum = members.reduce((s, m) => s + m.sharePct, 0);
  return members.every((m) => Number.isInteger(m.sharePct) && m.sharePct > 0 && m.sharePct <= 100) && sum === 100;
}

/** Split an amount by percentage shares, exact to the rupee (largest-remainder method). */
export function splitAmount(total: number, shares: Array<{ uid: string; sharePct: number }>): Record<string, number> {
  const raw = shares.map((s) => ({ uid: s.uid, exact: (total * s.sharePct) / 100 }));
  const out: Record<string, number> = {};
  let assigned = 0;
  for (const r of raw) {
    out[r.uid] = Math.floor(r.exact);
    assigned += out[r.uid]!;
  }
  const order = [...raw].sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
  for (let i = 0; assigned < total && i < order.length; i++, assigned++) out[order[i]!.uid]! += 1;
  return out;
}

export type PayoutLine = { uid: string; name: string; role: string; sharePct: number; entitledOnFee: number; entitledSoFar: number; paidOut: number; owedNow: number; confirmed: number };

/**
 * For each member: share of the full fee, share of what the brand has paid so far,
 * what the lead has paid out, and what is owed right now. The lead's own share is "kept", not paid out.
 */
export function payoutLines(pod: DealPod, feeAmount: number, receivedFromBrand: number, payouts: Payout[]): PayoutLine[] {
  const onFee = splitAmount(feeAmount, pod.members);
  const soFar = splitAmount(Math.min(receivedFromBrand, feeAmount), pod.members);
  return pod.members.map((m) => {
    const mine = payouts.filter((p) => p.toUid === m.uid);
    const paidOut = m.uid === pod.leadUid ? soFar[m.uid]! : mine.reduce((s, p) => s + p.amount, 0);
    return {
      uid: m.uid,
      name: m.name,
      role: m.role,
      sharePct: m.sharePct,
      entitledOnFee: onFee[m.uid]!,
      entitledSoFar: soFar[m.uid]!,
      paidOut,
      owedNow: Math.max(0, soFar[m.uid]! - paidOut),
      confirmed: mine.filter((p) => p.confirmedAt).reduce((s, p) => s + p.amount, 0),
    };
  });
}

export const POD_ROLE_SUGGESTIONS = [
  "Lead creator",
  "Food creator",
  "Lifestyle creator",
  "Local community creator",
  "Photographer",
  "Videographer",
  "Editor",
  "Scriptwriter",
] as const;
