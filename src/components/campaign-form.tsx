"use client";

import { useState, type FormEvent } from "react";
import { ChipSelect } from "./chip-select";
import { RateHint } from "./insights-ui";
import { DeliverablesEditor, type DeliverableRow } from "./deal-forms";
import { Button, Field, Input, Notice, Textarea } from "./ui";
import { api, ApiClientError } from "@/lib/client/api";
import { COMPENSATION_LABELS, COMPENSATION_TYPES, CREATOR_CATEGORIES } from "@/lib/config";
import { addDays, formatInr, todayIST } from "@/lib/deals";

export type Campaign = {
  id: string;
  title: string;
  description: string;
  city: string;
  categories: string[];
  deliverables: DeliverableRow[];
  compensationType: (typeof COMPENSATION_TYPES)[number];
  budgetMin: number;
  budgetMax: number;
  creatorsNeeded: number;
  applyBy: string;
  usageRights: string;
  status: "draft" | "open" | "closed";
  brandName: string;
  brandVerified: boolean;
  applicationsCount: number;
  acceptedCount: number;
};

export function budgetLabel(c: Pick<Campaign, "compensationType" | "budgetMin" | "budgetMax">): string {
  if (c.compensationType === "barter") return "Product / service exchange";
  const range = c.budgetMin === c.budgetMax ? formatInr(c.budgetMax) : `${formatInr(c.budgetMin)}–${formatInr(c.budgetMax)}`;
  return c.compensationType === "paid_plus_product" ? `${range} + product` : range;
}

export function CampaignForm({ canPublish, onDone, onCancel, initial, campaignId }: { canPublish: boolean; onDone: () => void; onCancel: () => void; initial?: Campaign; campaignId?: string }) {
  const [categories, setCategories] = useState<string[]>(initial?.categories ?? []);
  const [deliverables, setDeliverables] = useState<DeliverableRow[]>(initial?.deliverables ?? [{ type: "Instagram Reel", qty: 1, dueDate: "", note: "" }]);
  const [comp, setComp] = useState<Campaign["compensationType"]>(initial?.compensationType ?? "paid");
  const [city, setCity] = useState(initial?.city ?? "");
  const [budgetMax, setBudgetMax] = useState<number>(initial?.budgetMax ?? 0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>, status: "draft" | "open") {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const s = (k: string) => String(fd.get(k) ?? "");
    const n = (k: string) => Math.max(0, Math.floor(Number(fd.get(k)) || 0));
    const campaign = {
      title: s("title"),
      description: s("description"),
      city: s("city"),
      categories,
      deliverables: deliverables.map((d) => ({ ...d, qty: Number(d.qty) })),
      compensationType: comp,
      budgetMin: comp === "barter" ? 0 : n("budgetMin"),
      budgetMax: comp === "barter" ? 0 : n("budgetMax"),
      creatorsNeeded: Math.max(1, n("creatorsNeeded")),
      applyBy: s("applyBy"),
      usageRights: s("usageRights"),
      status,
    };
    setBusy(status);
    setErrors({});
    setMsg(null);
    try {
      if (campaignId) await api(`/api/campaigns/${campaignId}`, { method: "PATCH", body: { action: "update", campaign } });
      else await api("/api/campaigns", { body: campaign });
      onDone();
    } catch (err) {
      if (err instanceof ApiClientError) {
        const f = Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k.replace(/^campaign\./, ""), v]));
        setErrors(f);
        setMsg(err.message);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <form
      onSubmit={(e) => submit(e, canPublish && !campaignId ? "open" : "draft")}
      className="space-y-5"
      noValidate
    >
      <Field label="Campaign title" htmlFor="title" error={errors.title}>
        <Input id="title" name="title" defaultValue={initial?.title} maxLength={120} placeholder="e.g. Weekend brunch launch — 3 food creators" />
      </Field>
      <Field label="The brief" htmlFor="description" error={errors.description} hint="What you're promoting, the audience, the vibe, do's and don'ts.">
        <Textarea id="description" name="description" defaultValue={initial?.description} rows={5} maxLength={2000} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" htmlFor="city" error={errors.city}><Input id="city" name="city" defaultValue={initial?.city} maxLength={60} onChange={(e) => setCity(e.target.value)} /></Field>
        <Field label="Creators needed" htmlFor="creatorsNeeded" error={errors.creatorsNeeded}><Input id="creatorsNeeded" name="creatorsNeeded" type="number" min={1} max={50} defaultValue={initial?.creatorsNeeded ?? 1} /></Field>
        <Field label="Apply by" htmlFor="applyBy" error={errors.applyBy}><Input id="applyBy" name="applyBy" type="date" defaultValue={initial?.applyBy ?? addDays(todayIST(), 10)} /></Field>
      </div>
      <ChipSelect legend="Creator categories" options={CREATOR_CATEGORIES} value={categories} onChange={setCategories} max={4} />
      {errors.categories && <p className="text-xs font-medium text-red-600">{errors.categories}</p>}
      <DeliverablesEditor rows={deliverables} onChange={setDeliverables} max={10} errors={errors} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Compensation" htmlFor="comp">
          <select id="comp" value={comp} onChange={(e) => setComp(e.target.value as Campaign["compensationType"])} className="block w-full rounded-xl bg-white px-3.5 py-2.5 text-sm ring-1 ring-line">
            {COMPENSATION_TYPES.map((c) => <option key={c} value={c}>{COMPENSATION_LABELS[c]}</option>)}
          </select>
        </Field>
        <Field label="Budget per creator — min (₹)" htmlFor="budgetMin" error={errors.budgetMin}><Input id="budgetMin" name="budgetMin" type="number" min={0} disabled={comp === "barter"} defaultValue={initial?.budgetMin} /></Field>
        <Field label="Max (₹)" htmlFor="budgetMax" error={errors.budgetMax}><Input id="budgetMax" name="budgetMax" type="number" min={0} disabled={comp === "barter"} defaultValue={initial?.budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value) || 0)} /></Field>
      </div>
      {comp !== "barter" && categories[0] && deliverables[0] && (
        <RateHint
          category={categories[0]}
          type={deliverables[0].type}
          city={city}
          price={deliverables.length === 1 && budgetMax ? Math.round(budgetMax / Math.max(1, deliverables[0].qty)) : undefined}
        />
      )}
      <Field label="Content usage rights" htmlFor="usageRights" optional hint="Be specific — creators trust clear briefs more and apply faster.">
        <Input id="usageRights" name="usageRights" defaultValue={initial?.usageRights} maxLength={300} placeholder="Repost on our pages for 3 months; no paid ads without extra fee" />
      </Field>
      {msg && (
        <Notice tone="error">
          {msg} {/plan/i.test(msg) && <a href="/dashboard/plan" className="font-semibold underline">See plans →</a>}
        </Notice>
      )}
      <div className="flex flex-wrap gap-2">
        {canPublish && !campaignId && <Button type="submit" loading={busy === "open"}>Publish brief</Button>}
        <Button
          type="button"
          variant={canPublish && !campaignId ? "secondary" : "primary"}
          loading={busy === "draft"}
          onClick={(e) => {
            const form = (e.currentTarget as HTMLButtonElement).form;
            if (form) void submit({ preventDefault() {}, currentTarget: form } as unknown as FormEvent<HTMLFormElement>, "draft");
          }}
        >
          {campaignId ? "Save changes" : "Save as draft"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
