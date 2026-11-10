"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { budgetLabel, CampaignForm, type Campaign } from "@/components/campaign-form";
import { BrandTrustLine } from "@/components/insights-ui";
import type { BrandReliability } from "@/lib/insights";
import { Badge, Button, Card, Input, Notice, Spinner, cx } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth-context";
import { CREATOR_CATEGORIES } from "@/lib/config";

type Application = { id: string; campaignId: string; campaignTitle: string; brandName: string; status: string; proposedFee: number; dealId: string | null };

export default function CampaignsPage() {
  const { me } = useAuth();
  if (!me?.member) return <Notice tone="info">Accept your invite first.</Notice>;
  return me.member.role === "brand" ? <BrandCampaigns verified={Boolean(me.profile && "verified" in me.profile && me.profile.verified)} /> : <CreatorOpportunities />;
}

function BrandCampaigns({ verified }: { verified: boolean }) {
  const [items, setItems] = useState<Campaign[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ items: Campaign[] }>("/api/campaigns?scope=mine");
      setItems(r.items);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not load");
      setItems([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-muted">Write the brief once. Share one link. Get organised applications from verified creators — not 30 scattered chats.</p>
        </div>
        {!creating && <Button onClick={() => setCreating(true)}>+ New campaign brief</Button>}
      </div>
      {!verified && (
        <Notice tone="warn">
          You can draft briefs now. Publishing requires a verified business — <Link href="/dashboard/verification" className="font-medium underline">verify in 2 minutes</Link>.
        </Notice>
      )}
      {creating && (
        <Card>
          <CampaignForm
            canPublish={verified}
            onDone={async () => {
              setCreating(false);
              await load();
            }}
            onCancel={() => setCreating(false)}
          />
        </Card>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {items === null ? (
        <Spinner />
      ) : items.length === 0 && !creating ? (
        <Card className="text-center text-sm text-muted">No campaigns yet. Your first brief takes about 3 minutes.</Card>
      ) : (
        <ul className="space-y-3">
          {items.map((c) => (
            <li key={c.id}>
              <Link href={`/dashboard/campaigns/${c.id}`} className="block rounded-2xl bg-white p-5 ring-1 ring-line hover:ring-slate-300">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted">{c.city} · {budgetLabel(c)} · apply by {c.applyBy}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone="blue">{c.applicationsCount} applied</Badge>
                    <Badge tone={c.status === "open" ? "green" : c.status === "draft" ? "amber" : "slate"}>{c.status}</Badge>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreatorOpportunities() {
  const { me } = useAuth();
  const [items, setItems] = useState<Campaign[] | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [city, setCity] = useState("");
  const [cat, setCat] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ items: Campaign[] }>("/api/campaigns?scope=open")
      .then((r) => setItems(r.items))
      .catch((e) => {
        setError(e instanceof ApiClientError ? e.message : "Could not load");
        setItems([]);
      });
    api<{ items: Application[] }>("/api/applications").then((r) => setApps(r.items)).catch(() => undefined);
  }, []);

  const filtered = useMemo(
    () =>
      (items ?? []).filter(
        (c) => (!city || c.city.toLowerCase().includes(city.toLowerCase())) && (!cat || c.categories.includes(cat)),
      ),
    [items, city, cat],
  );
  const appliedIds = new Set(apps.map((a) => a.campaignId));
  const verified = Boolean(me?.profile && "verifiedPlatforms" in me.profile && me.profile.verifiedPlatforms.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
        <p className="mt-1 text-sm text-muted">Live briefs from verified businesses. Applying is always free.</p>
      </div>
      {!verified && (
        <Notice tone="warn">
          Brands only see applications from ownership-verified creators. <Link href="/dashboard/verification" className="font-medium underline">Verify an account</Link> to apply.
        </Notice>
      )}

      {apps.length > 0 && (
        <Card>
          <h2 className="font-semibold">My applications</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {apps.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={a.dealId ? `/dashboard/deals/${a.dealId}` : `/dashboard/campaigns/${a.campaignId}`} className="hover:underline">
                  {a.campaignTitle} <span className="text-muted">· {a.brandName}</span>
                </Link>
                <Badge tone={a.status === "accepted" ? "green" : a.status === "shortlisted" ? "blue" : a.status === "declined" ? "red" : "slate"}>
                  {a.status === "accepted" ? "Accepted — see deal" : a.status}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Input className="!w-48" placeholder="Filter by city" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Filter by city" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category" className="rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-line">
          <option value="">All categories</option>
          {CREATOR_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {items === null ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Card className="text-center text-sm text-muted">
          No open briefs{city || cat ? " match these filters" : " right now"}. Meanwhile, use the <Link href="/dashboard/deals" className="text-brand underline">Deal Desk</Link> to manage the collaborations you already have.
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link href={`/dashboard/campaigns/${c.id}`} className={cx("block h-full rounded-2xl bg-white p-5 ring-1 ring-line hover:ring-slate-300")}>
                <div className="flex items-center gap-2 text-sm text-muted">
                  {c.brandName} {c.brandVerified && <Badge tone="green">Verified business</Badge>}
                </div>
                <p className="mt-2 font-semibold">{c.title}</p>
                <p className="mt-1 text-sm text-muted">{c.city} · {budgetLabel(c)}</p>
                <p className="mt-2 line-clamp-2 text-sm">{c.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(c as Campaign & { featured?: boolean }).featured && <Badge tone="amber">★ Featured</Badge>}
                  {appliedIds.has(c.id) && <Badge tone="blue">Applied</Badge>}
                  <Badge>Apply by {c.applyBy}</Badge>
                  <BrandTrustLine r={(c as Campaign & { brandReliability?: BrandReliability | null }).brandReliability} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
