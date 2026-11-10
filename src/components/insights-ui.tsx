"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { formatInr } from "@/lib/deals";
import { fairness, type Benchmark, type BrandReliability, type CreatorReliability } from "@/lib/insights";
import { Badge } from "./ui";

export function BrandTrustLine({ r }: { r: BrandReliability | null | undefined }) {
  if (!r || r.verifiedDeals === 0) return <Badge tone="slate">New brand · no verified payment history yet</Badge>;
  if (r.paymentsWithDueDate === 0) return <Badge tone="blue">{r.verifiedDeals} verified deal{r.verifiedDeals > 1 ? "s" : ""}</Badge>;
  const ratio = r.paidOnTime / r.paymentsWithDueDate;
  return (
    <Badge tone={ratio >= 0.8 ? "green" : ratio >= 0.5 ? "amber" : "red"}>
      Paid on time {r.paidOnTime}/{r.paymentsWithDueDate} verified deals{r.repeatCreators ? ` · rehired ${r.repeatCreators}` : ""}
    </Badge>
  );
}

export function CreatorTrustLine({ r }: { r: CreatorReliability | null | undefined }) {
  if (!r || r.verifiedDeals === 0) return <Badge tone="slate">No two-sided confirmed deals yet</Badge>;
  return (
    <>
      <Badge tone="blue">{r.verifiedDeals} verified deal{r.verifiedDeals > 1 ? "s" : ""}</Badge>
      {r.deliverablesWithDueDate > 0 && (
        <Badge tone={r.deliveredOnTime / r.deliverablesWithDueDate >= 0.8 ? "green" : "amber"}>
          On time {r.deliveredOnTime}/{r.deliverablesWithDueDate}
        </Badge>
      )}
      {r.repeatClients > 0 && <Badge tone="teal">{r.repeatClients} repeat client{r.repeatClients > 1 ? "s" : ""}</Badge>}
    </>
  );
}

export type BenchResponse = {
  city: Benchmark | null;
  national: (Omit<Benchmark, "feeP25" | "feeP75" | "cpcMedian"> & { feeP25: number | null; feeP75: number | null; cpcMedian: number | null }) | null;
  locked: boolean;
  cityAvailableButLocked: boolean;
  thresholds: { minDeals: number; minCreators: number };
};

export function useBenchmark(category: string | undefined, type: string | undefined, city: string | undefined) {
  const [data, setData] = useState<BenchResponse | null>(null);
  useEffect(() => {
    if (!category || !type) return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ category, type, city: city ?? "" });
    const t = setTimeout(() => {
      api<BenchResponse>(`/api/benchmarks?${qs}`, { signal: ctrl.signal }).then(setData).catch(() => setData(null));
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [category, type, city]);
  return data;
}

/** Inline "is this price fair?" hint from the Rate & Results Index. Silent when there's no data. */
export function RateHint({ category, type, city, price, perUnit = true }: { category?: string; type?: string; city?: string; price?: number; perUnit?: boolean }) {
  const data = useBenchmark(category, type, city);
  if (!data) return null;
  const b = data.city ?? data.national;
  if (!b) return <p className="text-xs text-muted">Rate Index: not enough completed deals for {type} · {category} yet (needs {data.thresholds.minDeals}+).</p>;
  const where = data.city ? city : "India";
  const range = b.feeP25 !== null && b.feeP75 !== null ? `${formatInr(b.feeP25)}–${formatInr(b.feeP75)}` : null;
  const verdict = price && range ? fairness(price, b as Benchmark) : null;
  return (
    <p className="text-xs text-muted">
      Rate Index · {type}{perUnit ? " (per unit)" : ""}, {category}, {where}: {range ? <>typical <strong className="text-ink">{range}</strong>, </> : null}median <strong className="text-ink">{formatInr(b.feeMedian)}</strong> from {b.n} completed deals.
      {verdict === "below" && <span className="font-medium text-amber-700"> Your price is below the typical range.</span>}
      {verdict === "above" && <span className="font-medium text-blue-700"> Your price is above the typical range.</span>}
      {data.locked && <> <Link href="/dashboard/plan" className="font-medium text-brand underline">City ranges with Growth</Link></>}
    </p>
  );
}
