"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { budgetLabel, CampaignForm, type Campaign } from "@/components/campaign-form";
import { BrandTrustLine, CreatorTrustLine, RateHint } from "@/components/insights-ui";
import { CREATOR_CATEGORIES } from "@/lib/config";
import type { BrandReliability, CreatorReliability } from "@/lib/insights";
import { Badge, Button, Card, Field, Input, Notice, Spinner, Textarea } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth-context";
import { SOCIAL_PLATFORM_LABELS, site, type SocialPlatform } from "@/lib/config";
import { formatInr, whatsappLink } from "@/lib/deals";

type Application = {
  id: string;
  status: "applied" | "shortlisted" | "accepted" | "declined" | "withdrawn";
  pitch: string;
  proposedFee: number;
  availableBy: string;
  dealId: string | null;
  createdAt: string;
  creator: { displayName: string; handle: string; city: string; categories: string[]; verifiedPlatforms: string[]; trustSignals: number; isPublic: boolean };
  reliability?: CreatorReliability | null;
  pod?: { podId: string; name: string; members: Array<{ uid: string; name: string; role: string; sharePct: number }> } | null;
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const [data, setData] = useState<{ item: Campaign; isOwner: boolean; myApplication: Application | null; brandReliability: BrandReliability | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api(`/api/campaigns/${id}`));
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not load");
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  if (error && !data) return <Notice tone="error">{error}</Notice>;
  if (!data || !me) return <Spinner />;
  const c = data.item;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/dashboard/campaigns" className="text-sm text-muted hover:text-ink">← Campaigns</Link>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {c.brandName} {c.brandVerified && <Badge tone="green">Verified business</Badge>} {!data.isOwner && <BrandTrustLine r={data.brandReliability} />}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{c.title}</h1>
            <p className="mt-1 text-muted">{c.city} · {budgetLabel(c)} · {c.creatorsNeeded} creator{c.creatorsNeeded > 1 ? "s" : ""} · apply by {c.applyBy}</p>
          </div>
          <Badge tone={c.status === "open" ? "green" : c.status === "draft" ? "amber" : "slate"}>{c.status}</Badge>
        </div>
        <p className="whitespace-pre-line">{c.description}</p>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Deliverables</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {c.deliverables.map((d, i) => <li key={i}>• {d.qty}× {d.type}{d.dueDate ? ` — by ${d.dueDate}` : ""}{d.note ? ` (${d.note})` : ""}</li>)}
          </ul>
        </div>
        {c.usageRights && <p className="text-sm"><span className="text-muted">Usage rights:</span> {c.usageRights}</p>}
        <div className="flex flex-wrap gap-2">{c.categories.map((x) => <Badge key={x}>{x}</Badge>)}</div>
      </Card>

      {data.isOwner ? <OwnerPanel c={c} reload={load} /> : <ApplyPanel c={c} mine={data.myApplication} reload={load} />}
    </div>
  );
}

function OwnerPanel({ c, reload }: { c: Campaign; reload: () => Promise<void> }) {
  const { me } = useAuth();
  const [apps, setApps] = useState<Application[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const publicUrl = `${site.url}/c/${c.id}`;
  const verified = Boolean(me?.profile && "verified" in me.profile && me.profile.verified);

  const loadApps = useCallback(async () => {
    try {
      const r = await api<{ items: Application[] }>(`/api/campaigns/${c.id}/applications`);
      setApps(r.items);
    } catch {
      setApps([]);
    }
  }, [c.id]);
  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  async function campaignAction(action: "open" | "close") {
    setBusy(action);
    setError(null);
    try {
      await api(`/api/campaigns/${c.id}`, { method: "PATCH", body: { action } });
      await reload();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function decide(a: Application, action: "shortlist" | "accept" | "decline") {
    if (action === "accept" && !window.confirm(`Accept ${a.creator.displayName} at ${formatInr(a.proposedFee)}? This creates a deal on both dashboards.`)) return;
    setBusy(a.id);
    setError(null);
    try {
      await api(`/api/applications/${a.id}`, { method: "PATCH", body: { action, note: "" } });
      await Promise.all([loadApps(), reload()]);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const order = { shortlisted: 0, applied: 1, accepted: 2, declined: 3, withdrawn: 4 } as const;
  const sorted = [...(apps ?? [])].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <>
      {error && (
        <Notice tone="error">
          {error} {/plan/i.test(error) && <Link href="/dashboard/plan" className="font-semibold underline">See plans →</Link>}
        </Notice>
      )}
      <Card className="space-y-3">
        <h2 className="font-semibold">Manage</h2>
        <div className="flex flex-wrap gap-2">
          {c.status !== "open" && c.status !== "closed" && <Button onClick={() => campaignAction("open")} loading={busy === "open"} disabled={!verified}>Publish</Button>}
          {c.status === "open" && <Button variant="secondary" onClick={() => campaignAction("close")} loading={busy === "close"}>Close applications</Button>}
          {c.status !== "closed" && !(c.status === "open" && c.applicationsCount > 0) && <Button variant="ghost" onClick={() => setEditing((v) => !v)}>{editing ? "Close editor" : "Edit brief"}</Button>}
        </div>
        {!verified && c.status === "draft" && <p className="text-sm text-muted">Verify your business to publish. <Link href="/dashboard/verification" className="text-brand underline">Verify now</Link></p>}
        {c.status === "open" && (
          <div className="space-y-2 rounded-xl bg-paper p-4 ring-1 ring-line">
            <p className="text-sm">Share this brief anywhere — WhatsApp groups, Instagram bio, your creator contacts. Creators apply in one place.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={publicUrl} onFocus={(e) => e.currentTarget.select()} aria-label="Public brief link" />
              <Button variant="secondary" onClick={() => navigator.clipboard.writeText(publicUrl)}>Copy</Button>
              <a className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white" href={whatsappLink(undefined, `We're looking for creators: ${c.title} (${c.city}). Apply here: ${publicUrl}`)} target="_blank" rel="noopener noreferrer">
                Share on WhatsApp
              </a>
            </div>
          </div>
        )}
        {editing && (
          <div className="border-t border-line pt-4">
            <CampaignForm
              initial={c}
              campaignId={c.id}
              canPublish={verified}
              onCancel={() => setEditing(false)}
              onDone={async () => {
                setEditing(false);
                await reload();
              }}
            />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold">Applications ({apps?.length ?? 0})</h2>
        {apps === null ? (
          <Spinner />
        ) : sorted.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No applications yet{c.status === "open" ? " — share the link above to reach creators faster." : "."}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sorted.map((a) => (
              <li key={a.id} className="rounded-xl bg-paper p-4 ring-1 ring-line">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {a.creator.isPublic ? (
                        <Link href={`/p/${a.creator.handle}`} target="_blank" className="hover:underline">{a.creator.displayName} ↗</Link>
                      ) : (
                        a.creator.displayName
                      )}
                    </p>
                    <p className="text-sm text-muted">{a.creator.city} · {a.creator.categories.join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatInr(a.proposedFee)}</p>
                    <Badge tone={a.status === "accepted" ? "green" : a.status === "shortlisted" ? "blue" : a.status === "declined" ? "red" : "slate"}>{a.status}</Badge>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {a.creator.verifiedPlatforms.map((p) => <Badge key={p} tone="green">{SOCIAL_PLATFORM_LABELS[p as SocialPlatform] ?? p} verified</Badge>)}
                  <CreatorTrustLine r={a.reliability} />
                  {a.availableBy && <Badge>Available from {a.availableBy}</Badge>}
                </div>
                {a.pod && (
                  <div className="mt-3 rounded-lg bg-white p-3 ring-1 ring-line">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">Creator Pod · {a.pod.members.length} verified members</p>
                    <ul className="mt-1 flex flex-wrap gap-1.5">{a.pod.members.map((m) => <li key={m.uid}><Badge tone="blue">{m.name} · {m.role}</Badge></li>)}</ul>
                  </div>
                )}
                <p className="mt-3 whitespace-pre-line text-sm">{a.pitch}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.status === "accepted" && a.dealId && <Link href={`/dashboard/deals/${a.dealId}`} className="text-sm font-medium text-brand hover:underline">Open deal →</Link>}
                  {(a.status === "applied" || a.status === "shortlisted") && (
                    <>
                      <Button onClick={() => decide(a, "accept")} loading={busy === a.id}>Accept</Button>
                      {a.status === "applied" && <Button variant="secondary" onClick={() => decide(a, "shortlist")} disabled={busy === a.id}>Shortlist</Button>}
                      <Button variant="ghost" onClick={() => decide(a, "decline")} disabled={busy === a.id}>Decline</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function ApplyPanel({ c, mine, reload }: { c: Campaign; mine: Application | null; reload: () => Promise<void> }) {
  const { me } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fee, setFee] = useState(c.compensationType === "barter" ? 0 : c.budgetMin || 0);
  const [pods, setPods] = useState<Array<{ id: string; name: string; leadUid: string; status: string }>>([]);
  const [asPod, setAsPod] = useState("");
  useEffect(() => {
    api<{ items: Array<{ id: string; name: string; leadUid: string; status: string }> }>("/api/pods")
      .then((r) => setPods(r.items.filter((p) => p.leadUid === me?.uid && p.status === "active")))
      .catch(() => undefined);
  }, [me?.uid]);
  const verified = Boolean(me?.profile && "verifiedPlatforms" in me.profile && me.profile.verifiedPlatforms.length > 0);

  if (mine) {
    return (
      <Card className="space-y-3">
        <h2 className="font-semibold">Your application</h2>
        <p className="text-sm">Status: <Badge tone={mine.status === "accepted" ? "green" : mine.status === "declined" ? "red" : "blue"}>{mine.status}</Badge> · proposed {formatInr(mine.proposedFee)}</p>
        {mine.status === "accepted" && mine.dealId && <Link href={`/dashboard/deals/${mine.dealId}`} className="font-medium text-brand hover:underline">Open your deal and agree to terms →</Link>}
        {(mine.status === "applied" || mine.status === "shortlisted") && (
          <Button
            variant="ghost"
            onClick={async () => {
              if (!window.confirm("Withdraw your application?")) return;
              await api(`/api/applications/${mine.id}`, { method: "PATCH", body: { action: "withdraw", note: "" } }).catch(() => undefined);
              await reload();
            }}
          >
            Withdraw
          </Button>
        )}
      </Card>
    );
  }

  if (!verified) {
    return (
      <Notice tone="warn">
        Brands on CreatorsAI only receive applications from ownership-verified creators. <Link href="/dashboard/verification" className="font-medium underline">Verify an account (≈2 min)</Link>, then come back to apply.
      </Notice>
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    setMsg(null);
    try {
      await api(`/api/campaigns/${c.id}/applications`, {
        body: {
          pitch: String(fd.get("pitch") ?? ""),
          proposedFee: Math.max(0, Math.floor(Number(fd.get("proposedFee")) || 0)),
          availableBy: String(fd.get("availableBy") ?? ""),
          ...(asPod ? { podId: asPod } : {}),
        },
      });
      await reload();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        setMsg(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">Apply</h2>
      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        {pods.length > 0 && (
          <Field label="Apply as" htmlFor="asPod" hint={asPod ? "One application for the whole team. Your fee below is the pod's total; shares follow your pod settings." : undefined}>
            <select id="asPod" value={asPod} onChange={(e) => setAsPod(e.target.value)} className="block w-full rounded-xl bg-white px-3.5 py-2.5 text-sm ring-1 ring-line">
              <option value="">Just me</option>
              {pods.map((p) => <option key={p.id} value={p.id}>Pod: {p.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Why you're a great fit" htmlFor="pitch" error={errors.pitch} hint="Your audience, similar work you've done, an idea for this brief.">
          <Textarea id="pitch" name="pitch" rows={5} maxLength={1000} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your fee (₹)" htmlFor="proposedFee" error={errors.proposedFee} hint={c.compensationType === "barter" ? "Product exchange — enter 0" : `Brand budget: ${budgetLabel(c)}`}>
            <Input id="proposedFee" name="proposedFee" type="number" min={0} defaultValue={c.compensationType === "barter" ? 0 : c.budgetMin || undefined} onChange={(e) => setFee(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Available from" htmlFor="availableBy" error={errors.availableBy} optional>
            <Input id="availableBy" name="availableBy" type="date" />
          </Field>
        </div>
        {c.compensationType !== "barter" && (
          <RateHint
            category={(me?.profile as { categories?: string[] } | null)?.categories?.find((x) => (CREATOR_CATEGORIES as readonly string[]).includes(x)) ?? c.categories[0]}
            type={c.deliverables[0]?.type}
            city={c.city}
            price={c.deliverables.length === 1 && fee ? Math.round(fee / Math.max(1, c.deliverables[0]!.qty)) : undefined}
          />
        )}
        {msg && <Notice tone="error">{msg}</Notice>}
        <Button type="submit" loading={busy}>Send application</Button>
      </form>
    </Card>
  );
}
