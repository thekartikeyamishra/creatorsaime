"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, Field, Input, Notice, Spinner, Textarea } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";

type Billing = { legalName: string; address: string; gstin: string; upiId: string; invoicePrefix: string } | null;

export default function BillingPage() {
  const [b, setB] = useState<Billing | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ billing: Billing }>("/api/billing").then((r) => setB(r.billing)).catch(() => setB(null));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const s = (k: string) => String(fd.get(k) ?? "");
    setBusy(true);
    setErrors({});
    setMsg(null);
    try {
      await api("/api/billing", { method: "PUT", body: { legalName: s("legalName"), address: s("address"), gstin: s("gstin"), upiId: s("upiId"), invoicePrefix: s("invoicePrefix") || "INV" } });
      setMsg({ tone: "success", text: "Saved." });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        setMsg({ tone: "error", text: err.message });
      }
    } finally {
      setBusy(false);
    }
  }

  if (b === undefined) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing &amp; payout details</h1>
        <p className="mt-1 text-sm text-muted">Private. Used only on invoices and payment reminders you send. Never shown on your public profile.</p>
      </div>
      <Card>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="sm:col-span-2"><Field label="Name on invoices" htmlFor="legalName" error={errors.legalName}><Input id="legalName" name="legalName" defaultValue={b?.legalName} maxLength={120} required /></Field></div>
          <Field label="UPI ID" htmlFor="upiId" error={errors.upiId} optional hint="Shown on reminders so clients can pay in one tap"><Input id="upiId" name="upiId" defaultValue={b?.upiId} placeholder="name@okhdfcbank" /></Field>
          <Field label="GSTIN" htmlFor="gstin" error={errors.gstin} optional hint="Only if you're GST-registered"><Input id="gstin" name="gstin" defaultValue={b?.gstin} maxLength={15} /></Field>
          <div className="sm:col-span-2"><Field label="Address" htmlFor="address" error={errors.address} optional><Textarea id="address" name="address" defaultValue={b?.address} maxLength={300} /></Field></div>
          <Field label="Invoice prefix" htmlFor="invoicePrefix" error={errors.invoicePrefix} hint="e.g. RIYA → RIYA-2026-0001"><Input id="invoicePrefix" name="invoicePrefix" defaultValue={b?.invoicePrefix ?? "INV"} maxLength={6} /></Field>
          {msg && <div className="sm:col-span-2"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
          <div className="sm:col-span-2"><Button type="submit" loading={busy}>Save details</Button></div>
        </form>
      </Card>
    </div>
  );
}
