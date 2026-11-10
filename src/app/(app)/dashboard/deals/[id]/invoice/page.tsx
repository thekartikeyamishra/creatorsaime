"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Notice, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { balance, formatInr, received, type Deal } from "@/lib/deals";

type Billing = { legalName: string; address: string; gstin: string; upiId: string };
type Res = { deal: Deal; billing: Billing; issuedAt: string | null };

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Res | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    api<Res>(`/api/deals/${id}/invoice`, { method: "POST", body: {} })
      .then(setData)
      .catch((e) => setError(e instanceof ApiClientError ? { code: e.code, message: e.message } : { code: "x", message: "Could not create invoice" }));
  }, [id]);

  if (error)
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Notice tone="warn">{error.message}</Notice>
        {error.code === "billing_required" && <Link href="/dashboard/billing" className="font-medium text-brand underline">Add billing details →</Link>}
      </div>
    );
  if (!data) return <Spinner label="Preparing invoice" />;
  const { deal, billing } = data;
  const issued = data.issuedAt ? new Date(data.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Link href={`/dashboard/deals/${id}`} className="text-sm text-muted hover:text-ink">← Back to deal</Link>
        <span className="flex-1" />
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>
      <article className="rounded-2xl bg-white p-8 ring-1 ring-line print:rounded-none print:p-0 print:ring-0">
        <header className="flex flex-wrap justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="text-2xl font-semibold">{billing.gstin ? "Tax Invoice" : "Invoice"}</p>
            <p className="mt-1 font-mono text-sm">{deal.invoiceNumber}</p>
            <p className="text-sm text-muted">Date: {issued}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{billing.legalName}</p>
            {billing.address && <p className="whitespace-pre-line text-muted">{billing.address}</p>}
            {billing.gstin && <p>GSTIN: {billing.gstin}</p>}
          </div>
        </header>
        <section className="py-6 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Bill to</p>
          <p className="mt-1 font-medium">{deal.brandSide.name}</p>
          {deal.brandSide.email && <p className="text-muted">{deal.brandSide.email}</p>}
        </section>
        <table className="w-full text-left text-sm">
          <thead className="border-y border-line text-muted">
            <tr><th className="py-2 font-medium">Description</th><th className="py-2 text-right font-medium">Qty</th></tr>
          </thead>
          <tbody>
            <tr><td className="pt-3 font-medium" colSpan={2}>{deal.title}</td></tr>
            {deal.deliverables.map((d) => (
              <tr key={d.id}><td className="py-1 pl-3 text-muted">{d.type}{d.note ? ` — ${d.note}` : ""}</td><td className="py-1 text-right">{d.qty}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="mt-6 ml-auto w-full max-w-xs space-y-1 border-t border-line pt-4 text-sm">
          <Row k="Agreed fee" v={formatInr(deal.feeAmount)} />
          <Row k="Received" v={`− ${formatInr(received(deal))}`} />
          <Row k="Balance due" v={formatInr(balance(deal))} strong />
        </div>
        {billing.gstin && <p className="mt-4 text-xs text-muted">Amounts as agreed. Add applicable GST details (HSN/SAC, tax breakup) as required for your registration.</p>}
        <footer className="mt-8 border-t border-line pt-4 text-sm">
          {deal.paymentTerms && <p><span className="text-muted">Payment terms:</span> {deal.paymentTerms}</p>}
          {deal.paymentDueDate && <p><span className="text-muted">Due by:</span> {deal.paymentDueDate}</p>}
          {billing.upiId && <p><span className="text-muted">Pay via UPI:</span> <span className="font-mono">{billing.upiId}</span></p>}
          <p className="mt-6 text-xs text-muted">Generated with CreatorsAI Deal Desk.</p>
        </footer>
      </article>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between pt-1 text-base font-semibold" : "flex justify-between"}>
      <span className={strong ? "" : "text-muted"}>{k}</span>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}
