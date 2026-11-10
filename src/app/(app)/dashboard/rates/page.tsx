"use client";

import Link from "next/link";
import { useState } from "react";
import { useBenchmark } from "@/components/insights-ui";
import { Badge, Card, Field, Input, Notice, Select, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/client/auth-context";
import { CREATOR_CATEGORIES, DELIVERABLE_TYPES } from "@/lib/config";
import { formatInr } from "@/lib/deals";

export default function RateIndexPage() {
  const { me } = useAuth();
  const profile = me?.profile as { categories?: string[]; city?: string } | null | undefined;
  const firstCat = profile?.categories?.find((c) => (CREATOR_CATEGORIES as readonly string[]).includes(c)) ?? "Food & Restaurants";
  const [category, setCategory] = useState<string>(firstCat);
  const [type, setType] = useState<string>("Instagram Reel");
  const [city, setCity] = useState<string>(profile?.city ?? "");
  const data = useBenchmark(category, type, city);
  const isBrand = me?.member?.role === "brand";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Rate &amp; Results Index</h1>
          <Badge tone="blue">Only on CreatorsAI</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          What creators actually get paid — and what brands actually get back — from completed, paid deals logged on CreatorsAI. Not surveys, not guesses.
          {isBrand ? " Price your briefs right the first time." : " Free for creators: stop under-charging."}
        </p>
      </div>

      <Card className="grid gap-4 sm:grid-cols-3">
        <Field label="Category" htmlFor="cat"><Select id="cat" options={CREATOR_CATEGORIES} value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
        <Field label="Deliverable" htmlFor="type"><Select id="type" options={DELIVERABLE_TYPES} value={type} onChange={(e) => setType(e.target.value)} /></Field>
        <Field label="City" htmlFor="city" optional><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Prayagraj" /></Field>
      </Card>

      {!data ? (
        <Spinner />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <BenchCard title={city ? `${city}` : "Your city"} b={data.city} locked={data.locked && data.cityAvailableButLocked} min={data.thresholds.minDeals} />
          <BenchCard title="All of India" b={data.national} locked={false} min={data.thresholds.minDeals} partial={data.locked} />
        </div>
      )}

      {data?.locked && (
        <Notice tone="info">
          Growth unlocks city-level ranges and <strong>cost per customer</strong> — the number that tells you which creators bring real footfall and sales.{" "}
          <Link href="/dashboard/plan" className="font-semibold underline">See Growth</Link>
        </Notice>
      )}
      <p className="text-xs text-muted">
        Method: per-unit fee from completed deals with a single deliverable type and at least half the fee recorded as received. Groups are shown only with{" "}
        {data?.thresholds.minDeals ?? 5}+ deals from {data?.thresholds.minCreators ?? 3}+ different creators, so no individual can be identified. Updated daily.
      </p>
    </div>
  );
}

type B = { n: number; creators: number; feeP25: number | null; feeMedian: number; feeP75: number | null; cpcMedian: number | null; cpcN: number } | null;

function BenchCard({ title, b, locked, min, partial }: { title: string; b: B; locked: boolean; min: number; partial?: boolean }) {
  return (
    <Card>
      <p className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</p>
      {locked ? (
        <p className="mt-3 text-sm text-muted">Data available — unlock city-level ranges with Growth.</p>
      ) : !b ? (
        <p className="mt-3 text-sm text-muted">Not enough completed deals yet (needs {min}+). Every deal you complete on CreatorsAI makes this index better for everyone.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs text-muted">Median fee per unit</p>
            <p className="text-3xl font-semibold tabular-nums">{formatInr(b.feeMedian)}</p>
          </div>
          {b.feeP25 !== null && b.feeP75 !== null ? (
            <p className="text-sm">Typical range: <strong>{formatInr(b.feeP25)} – {formatInr(b.feeP75)}</strong></p>
          ) : partial ? (
            <p className="text-sm text-muted">Range hidden on Free plan.</p>
          ) : null}
          {b.cpcMedian !== null ? (
            <p className="text-sm">Median cost per customer: <strong>{formatInr(b.cpcMedian)}</strong> <span className="text-muted">({b.cpcN} tracked deals)</span></p>
          ) : !partial ? (
            <p className="text-sm text-muted">Cost per customer: not enough tracked redemptions yet.</p>
          ) : null}
          <p className="text-xs text-muted">{b.n} deals · {b.creators} creators</p>
        </div>
      )}
    </Card>
  );
}
