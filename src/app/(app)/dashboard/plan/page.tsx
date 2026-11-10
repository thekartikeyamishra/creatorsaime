"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BRAND_FREE_FEATURES, BRAND_GROWTH_FEATURES, Check, priceLine } from "@/components/pricing";
import { Badge, Button, Card, Notice, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth-context";
import { daysLeft, formatPaise, PRODUCTS, type ProductId } from "@/lib/plans";

type PlanState = {
  tier: "free" | "growth";
  expiresAt: string | null;
  paymentsEnabled: boolean;
  orders: Array<{ id: string; productId: ProductId; amountPaise: number; receiptNo: string; paidAt: string }>;
};

type CheckoutOrder = { keyId: string; orderId: string; amount: number; currency: string; name: string; description: string; prefill: { name: string; email: string } };

type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };

function loadCheckout(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Checkout unavailable")));
    s.onerror = () => reject(new Error("Could not load checkout. Check your connection."));
    document.body.appendChild(s);
  });
}

export default function PlanPage() {
  const { me, refreshMe } = useAuth();
  const [state, setState] = useState<PlanState | null>(null);
  const [busy, setBusy] = useState<ProductId | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await api<PlanState>("/api/plans"));
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiClientError ? e.message : "Could not load your plan" });
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!me?.member) return <Notice tone="info">Accept your invite first.</Notice>;

  if (me.member.role !== "brand") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your plan</h1>
        <Card className="space-y-3">
          <Badge tone="teal">Free forever</Badge>
          <p className="text-lg font-semibold">Creators never pay on CreatorsAI.</p>
          <p className="text-muted">Profile, Trust Passport, Deal Desk, reminders, invoices, results tracking and applying to campaigns are all free. We earn when brands run campaigns.</p>
          <Link href="/dashboard/deals" className="font-medium text-brand hover:underline">Open your Deal Desk →</Link>
        </Card>
      </div>
    );
  }

  async function buy(productId: ProductId) {
    setBusy(productId);
    setMsg(null);
    try {
      const order = await api<CheckoutOrder>("/api/plans/checkout", { body: { productId } });
      const Razorpay = await loadCheckout();
      await new Promise<void>((resolve) => {
        const rz = new Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: order.name,
          description: order.description,
          prefill: order.prefill,
          theme: { color: "#2563EB" },
          handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              await api("/api/plans/verify", { body: r });
              setMsg({ tone: "success", text: productId === "managed_pilot" ? "Managed Pilot booked — we'll contact you within one business day." : "Payment received. Growth is active — thank you!" });
            } catch (e) {
              setMsg({ tone: "info", text: e instanceof ApiClientError ? e.message : "Payment received — confirming. Refresh in a minute." });
            }
            await Promise.all([load(), refreshMe()]);
            resolve();
          },
          modal: { ondismiss: () => resolve() },
        });
        rz.on("payment.failed", () => setMsg({ tone: "error", text: "Payment failed or was declined. No money was taken — please try again." }));
        rz.open();
      });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : "Could not start payment" });
    } finally {
      setBusy(null);
    }
  }

  if (!state) return <Spinner />;
  const p = priceLine();
  const expiresMs = state.expiresAt ? new Date(state.expiresAt).getTime() : null;
  const left = daysLeft(expiresMs);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plan</h1>
        <p className="mt-1 text-sm text-muted">Prepaid — no auto-renewal, no surprise debits. Buying again adds time on top of what you have.</p>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {!state.paymentsEnabled && <Notice tone="warn">Online payments aren&apos;t configured yet. Contact us to upgrade.</Notice>}

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Current plan</p>
          <p className="text-2xl font-semibold">{state.tier === "growth" ? "Growth" : "Free"}</p>
          {state.tier === "growth" && expiresMs && (
            <p className="text-sm text-muted">
              Active until {new Date(expiresMs).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · {left} day{left === 1 ? "" : "s"} left
            </p>
          )}
        </div>
        {state.tier === "growth" ? <Badge tone="green">Active</Badge> : <Badge>Free</Badge>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold">Free</h2>
          <p className="mt-1 text-3xl font-semibold">₹0</p>
          <ul className="mt-5 space-y-2 text-sm">{BRAND_FREE_FEATURES.map((f) => <Check key={f}>{f}</Check>)}</ul>
        </Card>
        <Card className="ring-2 ring-brand">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Growth</h2>
            <Badge tone="blue">Most popular</Badge>
          </div>
          <p className="mt-1 text-3xl font-semibold">{p.monthly}<span className="text-base font-normal text-muted"> / month</span></p>
          <p className="text-sm text-muted">or {p.yearly} / year (≈ {p.perMonthYearly}/mo — 2 months free)</p>
          <ul className="mt-5 space-y-2 text-sm">{BRAND_GROWTH_FEATURES.map((f) => <Check key={f}>{f}</Check>)}</ul>
          <div className="mt-6 grid gap-2">
            <Button onClick={() => buy("growth_monthly")} loading={busy === "growth_monthly"} disabled={!state.paymentsEnabled || busy !== null}>
              {state.tier === "growth" ? "Add 1 month" : "Upgrade — 1 month"}
            </Button>
            <Button variant="secondary" onClick={() => buy("growth_yearly")} loading={busy === "growth_yearly"} disabled={!state.paymentsEnabled || busy !== null}>
              {state.tier === "growth" ? "Add 12 months" : "Upgrade — 12 months"}
            </Button>
          </div>
        </Card>
        <Card className="bg-ink text-white ring-ink">
          <h2 className="text-lg font-semibold">Managed Pilot</h2>
          <p className="mt-1 text-3xl font-semibold">{p.pilot}<span className="text-base font-normal text-slate-400"> one-time</span></p>
          <p className="mt-2 text-sm text-slate-300">{PRODUCTS.managed_pilot.blurb}</p>
          <ul className="mt-5 space-y-2 text-sm">
            <Check dark>Curated shortlist of verified creators for your goal</Check>
            <Check dark>Brief, agreements, deadlines handled for you</Check>
            <Check dark>Results report: clicks, redemptions, cost per customer</Check>
          </ul>
          <Button variant="light" className="mt-6 w-full" onClick={() => buy("managed_pilot")} loading={busy === "managed_pilot"} disabled={!state.paymentsEnabled || busy !== null}>
            Book a pilot
          </Button>
        </Card>
      </div>

      {state.orders.length > 0 && (
        <Card>
          <h2 className="font-semibold">Receipts</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {state.orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  {PRODUCTS[o.productId]?.name ?? o.productId} · {formatPaise(o.amountPaise)} · {o.paidAt ? new Date(o.paidAt).toLocaleDateString("en-IN") : ""}
                </span>
                <Link href={`/dashboard/plan/receipt/${o.id}`} className="font-mono text-brand hover:underline">{o.receiptNo}</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <p className="text-xs text-muted">
        Payments are processed securely by Razorpay (UPI, cards, net banking, wallets). We never see your card details. See our <Link href="/refund-policy" className="underline">refund policy</Link>.
      </p>
    </div>
  );
}
