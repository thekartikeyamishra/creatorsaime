"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChipSelect } from "@/components/chip-select";
import { Badge, Button, Card, Field, Input, Notice, Spinner, Textarea } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth-context";
import { CREATOR_CATEGORIES, PROFESSIONAL_SKILLS } from "@/lib/config";
import type { PodMember } from "@/lib/pods";

type Pod = { id: string; name: string; city: string; description: string; categories: string[]; leadUid: string; members: PodMember[]; isPublic: boolean; status: string };
type DirPod = { id: string; name: string; city: string; description: string; categories: string[]; members: Array<{ displayName: string; handle: string; role: string }> };

export default function PodsPage() {
  const { me } = useAuth();
  if (!me?.member) return <Notice tone="info">Accept your invite first.</Notice>;
  return me.member.role === "brand" ? <Directory brand /> : <MyPods />;
}

function MyPods() {
  const { me } = useAuth();
  const [pods, setPods] = useState<Pod[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setPods((await api<{ items: Pod[] }>("/api/pods")).items);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not load pods");
      setPods([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function respond(id: string, action: "accept_invite" | "decline_invite") {
    try {
      await api(`/api/pods/${id}`, { method: "PATCH", body: { action } });
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed");
    }
  }

  const invites = (pods ?? []).filter((p) => p.members.find((m) => m.uid === me?.uid)?.status === "invited");
  const mine = (pods ?? []).filter((p) => p.members.find((m) => m.uid === me?.uid)?.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Creator Pods</h1>
            <Badge tone="blue">New</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Team up with verified creators and professionals — a food creator, a local voice, a photographer — and win campaigns too big for one person.
            Roles and payment shares are agreed upfront, and every payout is tracked.
          </p>
        </div>
        {!creating && <Button onClick={() => setCreating(true)}>+ Start a pod</Button>}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {creating && (
        <Card>
          <CreatePod
            onDone={async (id) => {
              setCreating(false);
              window.location.href = `/dashboard/pods/${id}`;
            }}
            onCancel={() => setCreating(false)}
          />
        </Card>
      )}
      {invites.length > 0 && (
        <Card className="space-y-3 ring-2 ring-brand">
          <h2 className="font-semibold">Pod invites</h2>
          {invites.map((p) => {
            const m = p.members.find((x) => x.uid === me?.uid)!;
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper p-4 ring-1 ring-line">
                <div>
                  <p className="font-medium">{p.name} <span className="text-muted">· {p.city}</span></p>
                  <p className="text-sm text-muted">Role: {m.role} · {m.sharePct}% share · lead {p.members.find((x) => x.uid === p.leadUid)?.displayName}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => respond(p.id, "accept_invite")}>Join</Button>
                  <Button variant="ghost" onClick={() => respond(p.id, "decline_invite")}>Decline</Button>
                </div>
              </div>
            );
          })}
        </Card>
      )}
      {pods === null ? (
        <Spinner />
      ) : mine.length === 0 && !creating ? (
        <Card className="text-center text-sm text-muted">You&apos;re not in a pod yet. Start one and invite people you already work with by their CreatorsAI handle.</Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {mine.map((p) => (
            <li key={p.id}>
              <Link href={`/dashboard/pods/${p.id}`} className="block h-full rounded-2xl bg-white p-5 ring-1 ring-line hover:ring-slate-300">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{p.name}</p>
                  {p.leadUid === me?.uid && <Badge tone="teal">Lead</Badge>}
                </div>
                <p className="text-sm text-muted">{p.city} · {p.members.filter((m) => m.status === "active").length} active member(s)</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{p.members.map((m) => <Badge key={m.uid} tone={m.status === "active" ? "blue" : "amber"}>{m.displayName} · {m.role}</Badge>)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Directory />
    </div>
  );
}

function CreatePod({ onDone, onCancel }: { onDone: (id: string) => void; onCancel: () => void }) {
  const { me } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setErrors({});
    try {
      const r = await api<{ id: string }>("/api/pods", {
        body: { name: String(fd.get("name") ?? ""), city: String(fd.get("city") ?? ""), description: String(fd.get("description") ?? ""), categories, isPublic: fd.get("isPublic") === "on" },
      });
      onDone(r.id);
    } catch (err) {
      if (err instanceof ApiClientError) setErrors({ ...err.fields, _: err.message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pod name" htmlFor="name" error={errors.name}><Input id="name" name="name" maxLength={60} placeholder="e.g. Sangam Food Crew" /></Field>
        <Field label="City" htmlFor="city" error={errors.city}><Input id="city" name="city" maxLength={60} defaultValue={(me?.profile as { city?: string } | null)?.city ?? ""} /></Field>
      </div>
      <Field label="What does the pod do best?" htmlFor="description" error={errors.description} optional>
        <Textarea id="description" name="description" maxLength={500} placeholder="Restaurant launches in Prayagraj: reels, local reach and food photography." />
      </Field>
      <ChipSelect legend="Focus" options={[...CREATOR_CATEGORIES, ...PROFESSIONAL_SKILLS]} value={categories} onChange={setCategories} max={4} />
      {errors.categories && <p className="text-xs text-red-600">{errors.categories}</p>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" defaultChecked className="size-4" /> List the pod in the directory so brands can find it</label>
      {errors._ && <Notice tone="error">{errors._}</Notice>}
      <div className="flex gap-2">
        <Button type="submit" loading={busy}>Create pod</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function Directory({ brand }: { brand?: boolean }) {
  const [city, setCity] = useState("");
  const [items, setItems] = useState<DirPod[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      api<{ items: DirPod[] }>(`/api/pods/directory?city=${encodeURIComponent(city)}`).then((r) => setItems(r.items)).catch(() => setItems([]));
    }, 300);
    return () => clearTimeout(t);
  }, [city]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={brand ? "text-2xl font-semibold tracking-tight" : "text-lg font-semibold"}>{brand ? "Find a Creator Pod" : "Pod directory"}</h2>
          {brand && <p className="mt-1 text-sm text-muted">Verified creator teams that take on a whole campaign together. Share your brief link with a pod, or book a Managed Pilot and we&apos;ll assemble one.</p>}
        </div>
        <Input className="!w-56" placeholder="Filter by city" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Filter pods by city" />
      </div>
      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card className="text-sm text-muted">No public pods{city ? ` in ${city}` : ""} yet.</Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/pods/${p.id}`} className="block h-full rounded-2xl bg-white p-5 ring-1 ring-line hover:ring-slate-300">
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-muted">{p.city} · {p.members.length} members · {p.categories.join(", ")}</p>
                {p.description && <p className="mt-2 line-clamp-2 text-sm">{p.description}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">{p.members.map((m) => <Badge key={m.handle}>{m.role}</Badge>)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
