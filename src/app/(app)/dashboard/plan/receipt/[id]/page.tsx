"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Notice, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { site } from "@/lib/config";
import { formatPaise, PRODUCTS, type ProductId } from "@/lib/plans";

type R = {
  order: { id: string; productId: ProductId; amountPaise: number; receiptNo: string; paymentId: string; paidAt: string; buyer: { name: string; email: string } };
  billing: { legalName?: string; address?: string; gstin?: string } | null;
};

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<R | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<R>(`/api/plans/receipt/${id}`).then(setR).catch((e) => setError(e instanceof ApiClientError ? e.message : "Could not load receipt"));
  }, [id]);
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!r) return <Spinner />;
  const { order, billing } = r;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex gap-2 print:hidden">
        <Link href="/dashboard/plan" className="text-sm text-muted hover:text-ink">← Plan</Link>
        <span className="flex-1" />
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>
      <article className="rounded-2xl bg-white p-8 ring-1 ring-line print:p-0 print:ring-0">
        <div className="flex flex-wrap justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="text-2xl font-semibold">Payment receipt</p>
            <p className="mt-1 font-mono text-sm">{order.receiptNo}</p>
            <p className="text-sm text-muted">{new Date(order.paidAt).toLocaleString("en-IN")}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{site.name}</p>
            <p className="text-muted">{site.founder}</p>
            <p className="text-muted">{site.url.replace(/^https?:\/\//, "")}</p>
          </div>
        </div>
        <div className="py-6 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Billed to</p>
          <p className="mt-1 font-medium">{billing?.legalName || order.buyer.name}</p>
          {billing?.address && <p className="whitespace-pre-line text-muted">{billing.address}</p>}
          {billing?.gstin && <p>GSTIN: {billing.gstin}</p>}
          <p className="text-muted">{order.buyer.email}</p>
        </div>
        <div className="flex justify-between border-y border-line py-4">
          <span>{PRODUCTS[order.productId]?.name ?? order.productId}</span>
          <span className="font-semibold">{formatPaise(order.amountPaise)}</span>
        </div>
        <div className="flex justify-between py-4 text-lg font-semibold">
          <span>Total paid</span>
          <span>{formatPaise(order.amountPaise)}</span>
        </div>
        <p className="text-xs text-muted">Payment ID {order.paymentId} · Order {order.id} · Processed by Razorpay.</p>
      </article>
    </div>
  );
}
