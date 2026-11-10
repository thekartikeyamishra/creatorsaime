/**
 * Moat engines — pure, deterministic, unit-tested.
 *
 * 1. Trust Graph: two-sided reliability built ONLY from deals both parties confirmed.
 *    Transparent metrics with sample sizes — never an opaque single score.
 * 2. Rate & Results Index: local fee and cost-per-customer benchmarks from completed,
 *    paid deals. Published only above k-anonymity thresholds.
 */
import { received, sideOf, type Deal } from "./deals";

// ───────────────────────── Trust Graph ─────────────────────────

/** Date (YYYY-MM-DD) on which the fee was fully paid, or null. */
export function paidInFullDate(deal: Pick<Deal, "payments" | "feeAmount">): string | null {
  if (deal.feeAmount <= 0) return null;
  let sum = 0;
  for (const p of [...deal.payments].sort((a, b) => a.date.localeCompare(b.date))) {
    sum += p.amount;
    if (sum >= deal.feeAmount) return p.date;
  }
  return null;
}

export type CreatorReliability = {
  verifiedDeals: number;
  deliverablesWithDueDate: number;
  deliveredOnTime: number;
  repeatClients: number;
  distinctClients: number;
};

export type BrandReliability = {
  verifiedDeals: number;
  paymentsWithDueDate: number;
  paidOnTime: number;
  repeatCreators: number;
  distinctCreators: number;
};

export type Reliability = { asCreator: CreatorReliability; asBrand: BrandReliability };

type DeliverableWithDate = Deal["deliverables"][number] & { deliveredAt?: string };

function counterpartyKey(p: { uid: string | null; name: string }): string {
  return p.uid ?? `name:${p.name.trim().toLowerCase()}`;
}

/** Computes reliability for one member from deals where BOTH sides confirmed completion. */
export function computeReliability(uid: string, deals: Deal[]): Reliability {
  const verified = deals.filter((d) => (d as Deal & { verifiedCompletion?: boolean }).verifiedCompletion && d.status !== "cancelled");
  const c: CreatorReliability = { verifiedDeals: 0, deliverablesWithDueDate: 0, deliveredOnTime: 0, repeatClients: 0, distinctClients: 0 };
  const b: BrandReliability = { verifiedDeals: 0, paymentsWithDueDate: 0, paidOnTime: 0, repeatCreators: 0, distinctCreators: 0 };
  const clients = new Map<string, number>();
  const creators = new Map<string, number>();

  for (const d of verified) {
    const podMember = d.pod?.members.some((m) => m.uid === uid) ?? false;
    const side = sideOf(d, uid) ?? (podMember ? "creator" : null);
    if (side === "creator") {
      c.verifiedDeals++;
      const k = counterpartyKey(d.brandSide);
      clients.set(k, (clients.get(k) ?? 0) + 1);
      for (const x of d.deliverables as DeliverableWithDate[]) {
        // In pod deals each member is accountable only for their own work (unassigned → lead).
        if (d.pod && (x.assigneeUid ?? d.pod.leadUid) !== uid) continue;
        // Only deliverables with both a due date and a recorded delivery date are evidence.
        if (!x.dueDate || !x.deliveredAt) continue;
        c.deliverablesWithDueDate++;
        if (x.deliveredAt <= x.dueDate) c.deliveredOnTime++;
      }
    } else if (side === "brand") {
      b.verifiedDeals++;
      const k = counterpartyKey(d.creatorSide);
      creators.set(k, (creators.get(k) ?? 0) + 1);
      if (d.paymentDueDate && d.feeAmount > 0) {
        b.paymentsWithDueDate++;
        const paid = paidInFullDate(d);
        if (paid && paid <= d.paymentDueDate) b.paidOnTime++;
      }
    }
  }
  c.distinctClients = clients.size;
  c.repeatClients = [...clients.values()].filter((n) => n >= 2).length;
  b.distinctCreators = creators.size;
  b.repeatCreators = [...creators.values()].filter((n) => n >= 2).length;
  return { asCreator: c, asBrand: b };
}

/** Human summary with sample size. Returns null when there is nothing honest to say yet. */
export function onTimeLabel(hit: number, total: number, noun: string): string | null {
  if (total === 0) return null;
  return `${noun} on time in ${hit} of ${total}`;
}

// ───────────────────── Rate & Results Index ─────────────────────

export const K_MIN_DEALS = 5;
export const K_MIN_CREATORS = 3;

export type BenchmarkSample = { creatorUid: string; city: string; category: string; type: string; feePerUnit: number; costPerCustomer: number | null };

export type Benchmark = {
  key: string;
  city: string; // normalised lowercase, or "all"
  category: string;
  type: string;
  n: number;
  creators: number;
  feeP25: number;
  feeMedian: number;
  feeP75: number;
  cpcMedian: number | null;
  cpcN: number;
};

export function normCity(city: string): string {
  const c = city.trim().toLowerCase().replace(/\s+/g, " ");
  const aliases: Record<string, string> = { allahabad: "prayagraj", bombay: "mumbai", bangalore: "bengaluru", gurgaon: "gurugram", secunderabad: "hyderabad" };
  return aliases[c] ?? c;
}

export function benchmarkKey(city: string, category: string, type: string): string {
  return `${normCity(city) || "all"}|${category}|${type}`.toLowerCase();
}

/** Linear-interpolated percentile on a sorted copy. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return Math.round(s[lo]! + (s[hi]! - s[lo]!) * (idx - lo));
}

/**
 * A deal contributes a sample only if: completed (not cancelled), paid deal with fee > 0,
 * at least half the fee actually recorded as received, and all deliverables share one type
 * (so fee-per-unit is meaningful).
 */
export function sampleFromDeal(d: Deal, creatorProfile: { city: string; categories: string[] } | undefined): BenchmarkSample | null {
  if (d.status !== "completed" || d.compensationType === "barter" || d.feeAmount <= 0) return null;
  if (d.pod) return null; // team fees aren't comparable with individual per-unit rates
  if (!d.creatorSide.uid || !creatorProfile || !creatorProfile.city || creatorProfile.categories.length === 0) return null;
  if (received(d) < d.feeAmount * 0.5) return null;
  const types = new Set(d.deliverables.map((x) => x.type));
  if (types.size !== 1) return null;
  const units = d.deliverables.reduce((s, x) => s + x.qty, 0);
  if (units <= 0) return null;
  const r = d.tracking?.redemptions ?? 0;
  return {
    creatorUid: d.creatorSide.uid,
    city: normCity(creatorProfile.city),
    category: creatorProfile.categories[0]!,
    type: [...types][0]!,
    feePerUnit: Math.round(d.feeAmount / units),
    costPerCustomer: r > 0 ? Math.round(d.feeAmount / r) : null,
  };
}

/** Aggregates samples into city-level and national ("all") benchmarks, suppressing small groups. */
export function aggregateBenchmarks(samples: BenchmarkSample[]): Benchmark[] {
  const groups = new Map<string, { city: string; category: string; type: string; s: BenchmarkSample[] }>();
  const push = (city: string, s: BenchmarkSample) => {
    const key = benchmarkKey(city === "all" ? "" : city, s.category, s.type);
    const g = groups.get(key) ?? { city, category: s.category, type: s.type, s: [] };
    g.s.push(s);
    groups.set(key, g);
  };
  for (const s of samples) {
    push(s.city, s);
    push("all", s);
  }
  const out: Benchmark[] = [];
  for (const [key, g] of groups) {
    const creators = new Set(g.s.map((x) => x.creatorUid)).size;
    if (g.s.length < K_MIN_DEALS || creators < K_MIN_CREATORS) continue;
    const fees = g.s.map((x) => x.feePerUnit);
    const cpc = g.s.map((x) => x.costPerCustomer).filter((x): x is number => x !== null);
    out.push({
      key,
      city: g.city,
      category: g.category,
      type: g.type,
      n: g.s.length,
      creators,
      feeP25: percentile(fees, 0.25),
      feeMedian: percentile(fees, 0.5),
      feeP75: percentile(fees, 0.75),
      cpcMedian: cpc.length >= K_MIN_DEALS ? percentile(cpc, 0.5) : null,
      cpcN: cpc.length,
    });
  }
  return out;
}

/** Compares a proposed price with a benchmark. */
export function fairness(price: number, b: Pick<Benchmark, "feeP25" | "feeMedian" | "feeP75">): "below" | "typical" | "above" {
  if (price < b.feeP25) return "below";
  if (price > b.feeP75) return "above";
  return "typical";
}
