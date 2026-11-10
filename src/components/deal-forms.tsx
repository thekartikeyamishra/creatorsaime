"use client";

import { useState, type FormEvent } from "react";
import { COMPENSATION_LABELS, COMPENSATION_TYPES, DELIVERABLE_TYPES, LIMITS } from "@/lib/config";
import type { Deal } from "@/lib/deals";
import { useLocale } from "./locale-provider";
import { Button, Field, Input, Notice, Select } from "./ui";

export type DeliverableRow = { type: string; qty: number; dueDate: string; note: string };

export type TermsValue = {
  title: string;
  deliverables: DeliverableRow[];
  compensationType: (typeof COMPENSATION_TYPES)[number];
  feeAmount: number;
  paymentTerms: string;
  paymentDueDate: string;
  usageRights: string;
  revisionLimit: number;
};

export function termsFromDeal(d: Deal): TermsValue {
  return {
    title: d.title,
    deliverables: d.deliverables.map((x) => ({ type: x.type, qty: x.qty, dueDate: x.dueDate, note: x.note })),
    compensationType: d.compensationType,
    feeAmount: d.feeAmount,
    paymentTerms: d.paymentTerms,
    paymentDueDate: d.paymentDueDate,
    usageRights: d.usageRights,
    revisionLimit: d.revisionLimit,
  };
}

export const emptyTerms: TermsValue = {
  title: "",
  deliverables: [{ type: "Instagram Reel", qty: 1, dueDate: "", note: "" }],
  compensationType: "paid",
  feeAmount: 0,
  paymentTerms: "",
  paymentDueDate: "",
  usageRights: "",
  revisionLimit: 2,
};

export function DeliverablesEditor({ rows, onChange, max = LIMITS.deliverablesPerDeal, errors }: { rows: DeliverableRow[]; onChange: (r: DeliverableRow[]) => void; max?: number; errors?: Record<string, string> }) {
  const { t } = useLocale();
  const set = (i: number, patch: Partial<DeliverableRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{t("form.deliverables")}</legend>
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 rounded-xl bg-paper p-3 ring-1 ring-line sm:grid-cols-[1.6fr_0.6fr_1fr_auto]">
          <Select aria-label={`Deliverable ${i + 1} type`} options={DELIVERABLE_TYPES} value={r.type} onChange={(e) => set(i, { type: e.target.value })} />
          <Input aria-label="Quantity" type="number" min={1} max={50} value={r.qty} onChange={(e) => set(i, { qty: Math.max(1, Number(e.target.value) || 1) })} />
          <Input aria-label="Due date" type="date" value={r.dueDate} onChange={(e) => set(i, { dueDate: e.target.value })} />
          <Button type="button" variant="ghost" onClick={() => onChange(rows.filter((_, j) => j !== i))} disabled={rows.length === 1} aria-label="Remove deliverable">
            ✕
          </Button>
          <Input className="sm:col-span-4" aria-label="Note" placeholder={t("form.notePh")} maxLength={200} value={r.note} onChange={(e) => set(i, { note: e.target.value })} />
          {errors?.[`deliverables.${i}.dueDate`] && <p className="text-xs text-red-600 sm:col-span-4">{errors[`deliverables.${i}.dueDate`]}</p>}
        </div>
      ))}
      {rows.length < max && (
        <Button type="button" variant="secondary" onClick={() => onChange([...rows, { type: "Instagram Reel", qty: 1, dueDate: "", note: "" }])}>
          {t("form.addDeliverable")}
        </Button>
      )}
      {errors?.deliverables && <p className="text-xs font-medium text-red-600">{errors.deliverables}</p>}
    </fieldset>
  );
}

/** Shared editor for agreed terms (create + edit). */
export function TermsEditor({ value, onChange, errors = {} }: { value: TermsValue; onChange: (v: TermsValue) => void; errors?: Record<string, string> }) {
  const { t } = useLocale();
  const set = (patch: Partial<TermsValue>) => onChange({ ...value, ...patch });
  const pick = (prefix: string) => errors[prefix] ?? errors[`terms.${prefix}`];
  const prefixed = Object.fromEntries(Object.entries(errors).map(([k, v]) => [k.replace(/^terms\./, ""), v]));
  return (
    <div className="space-y-5">
      <Field label={t("form.what")} htmlFor="title" error={pick("title")}>
        <Input id="title" value={value.title} maxLength={120} placeholder={t("form.whatPh")} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <DeliverablesEditor rows={value.deliverables} onChange={(deliverables) => set({ deliverables })} errors={prefixed} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("form.compensation")} htmlFor="compensationType">
          <select
            id="compensationType"
            value={value.compensationType}
            onChange={(e) => set({ compensationType: e.target.value as TermsValue["compensationType"] })}
            className="block w-full rounded-xl bg-white px-3.5 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-brand focus:outline-none"
          >
            {COMPENSATION_TYPES.map((c) => (
              <option key={c} value={c}>{COMPENSATION_LABELS[c]}</option>
            ))}
          </select>
        </Field>
        <Field label={t("form.fee")} htmlFor="feeAmount" error={pick("feeAmount")}>
          <Input
            id="feeAmount"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            disabled={value.compensationType === "barter"}
            value={value.compensationType === "barter" ? 0 : value.feeAmount || ""}
            onChange={(e) => set({ feeAmount: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
          />
        </Field>
        <Field label={t("form.paymentDue")} htmlFor="paymentDueDate" error={pick("paymentDueDate")} optional>
          <Input id="paymentDueDate" type="date" value={value.paymentDueDate} onChange={(e) => set({ paymentDueDate: e.target.value })} />
        </Field>
      </div>
      <Field label={t("form.paymentTerms")} htmlFor="paymentTerms" optional hint={t("form.paymentTermsHint")}>
        <Input id="paymentTerms" value={value.paymentTerms} maxLength={300} onChange={(e) => set({ paymentTerms: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label={t("form.usage")} htmlFor="usageRights" optional hint={t("form.usageHint")}>
          <Input id="usageRights" value={value.usageRights} maxLength={300} onChange={(e) => set({ usageRights: e.target.value })} />
        </Field>
        <Field label={t("form.revisions")} htmlFor="revisionLimit">
          <Input id="revisionLimit" type="number" min={0} max={10} value={value.revisionLimit} onChange={(e) => set({ revisionLimit: Math.min(10, Math.max(0, Number(e.target.value) || 0)) })} />
        </Field>
      </div>
    </div>
  );
}

export function toTermsPayload(v: TermsValue) {
  return { ...v, feeAmount: v.compensationType === "barter" ? 0 : v.feeAmount, deliverables: v.deliverables.map((d) => ({ ...d, qty: Number(d.qty) })) };
}

/** "Log a deal" — bring any existing collaboration, including off-platform clients. */
export function NewDealForm({ iAmBrand, onCreate, onCancel }: { iAmBrand: boolean; onCreate: (body: unknown) => Promise<{ fields?: Record<string, string>; message?: string } | void>; onCancel: () => void }) {
  const { t } = useLocale();
  const [terms, setTerms] = useState<TermsValue>(emptyTerms);
  const [cp, setCp] = useState({ name: "", phone: "", email: "" });
  const [already, setAlready] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMsg(null);
    const res = await onCreate({ terms: toTermsPayload(terms), counterparty: cp, status: already ? "completed" : "active" });
    if (res) {
      setErrors(res.fields ?? {});
      setMsg(res.message ?? "Please check the form.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t(iAmBrand ? "form.creatorName" : "form.clientName")} htmlFor="cpName" error={errors["counterparty.name"]}>
          <Input id="cpName" value={cp.name} maxLength={100} onChange={(e) => setCp({ ...cp, name: e.target.value })} />
        </Field>
        <Field label={t("form.theirWhatsApp")} htmlFor="cpPhone" error={errors["counterparty.phone"]} optional hint={t("form.forReminders")}>
          <Input id="cpPhone" type="tel" inputMode="tel" value={cp.phone} placeholder="98765 43210" onChange={(e) => setCp({ ...cp, phone: e.target.value })} />
        </Field>
        <Field label={t("form.theirEmail")} htmlFor="cpEmail" error={errors["counterparty.email"]} optional>
          <Input id="cpEmail" type="email" value={cp.email} onChange={(e) => setCp({ ...cp, email: e.target.value })} />
        </Field>
      </div>
      <TermsEditor value={terms} onChange={setTerms} errors={errors} />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-4" checked={already} onChange={(e) => setAlready(e.target.checked)} />
        <span>{t("form.alreadyDone")}</span>
      </label>
      {msg && <Notice tone="error">{msg}</Notice>}
      <div className="flex gap-2">
        <Button type="submit" loading={busy}>{t("form.saveDeal")}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}

export function Textish({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}

