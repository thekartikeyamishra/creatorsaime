"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";

/**
 * Consent gate shown immediately before payment.
 *
 * WHY THREE SEPARATE BOXES AND NOT ONE
 * ------------------------------------
 * A single "I agree to everything" checkbox is weak evidence, and in the EU a
 * bundled consent is often treated as no consent at all. Each box is a distinct
 * thing the buyer is agreeing to, and the server stores each one separately
 * against the order with the policy version, timestamp, IP and country.
 *
 * The third box is the one that carries the money. EU and UK consumers have a
 * 14-day right to withdraw from a digital purchase. That right OVERRIDES any
 * "no refunds" wording in the terms unless the buyer expressly requests
 * immediate performance and acknowledges losing it. So we ask for exactly that,
 * in plain language, and we do not pre-tick it.
 *
 * None of the boxes are pre-ticked. A pre-ticked consent box is invalid under
 * GDPR case law and looks like dark-pattern behaviour to a card network.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export type Pack = { id: string; credits: number; label: string; price: string };

export default function CheckoutConsent({
  pack,
  onCancel,
}: {
  pack: Pack;
  onCancel?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [refunds, setRefunds] = useState(false);
  const [waiver, setWaiver] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const ready = emailValid && terms && refunds && waiver;

  async function startCheckout() {
    if (!ready) return;
    if (!API_BASE) {
      setStatus("error");
      setError("Payments are not configured on this deployment.");
      return;
    }
    setStatus("loading");
    setError("");

    try {
      const res = await fetch(`${API_BASE}/v1/checkout/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: pack.id,
          email,
          consent: {
            acceptedTerms: terms,
            acceptedRefundPolicy: refunds,
            immediateAccessWaiver: waiver,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout.");

      if (data.accountToken) {
        try {
          window.localStorage.setItem("creatorsai:account", data.accountToken);
        } catch {
          /* private mode — the token is also returned after verification */
        }
      }
      await openRazorpay(data, email, setStatus, setError);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-800/60 p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-2xl text-bone">{pack.label}</h3>
        <span className="text-lg text-coral">{pack.price}</span>
      </div>
      <p className="mt-1 text-sm text-bone-dim">
        {pack.credits} credits · one-off payment, not a subscription · credits
        never expire
      </p>

      <label htmlFor="checkout-email" className="mt-6 block text-sm text-bone-dim">
        Email for your receipt and account
      </label>
      <input
        id="checkout-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        autoComplete="email"
        className="mt-2 w-full rounded-xl border border-ink-600 bg-ink py-3 px-4 text-bone placeholder:text-bone-faint focus:border-coral/50 focus:outline-none"
      />

      <fieldset className="mt-6 space-y-3">
        <legend className="sr-only">Required confirmations</legend>

        <Check checked={terms} onChange={setTerms} id="c-terms">
          I have read and agree to the{" "}
          <Link href="/terms/" target="_blank" className="text-coral hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy/" target="_blank" className="text-coral hover:underline">
            Privacy Policy
          </Link>
          .
        </Check>

        <Check checked={refunds} onChange={setRefunds} id="c-refunds">
          I have read the{" "}
          <Link href="/refunds/" target="_blank" className="text-coral hover:underline">
            Refund &amp; Cancellation Policy
          </Link>{" "}
          and understand that <strong>credits I actually spend are not refundable</strong>,
          while unused credits stay refundable for 14 days.
        </Check>

        <Check checked={waiver} onChange={setWaiver} id="c-waiver">
          I request <strong>immediate access</strong> to my credits, and I accept
          that once I spend a credit I lose the 14-day right to withdraw{" "}
          <em>for that credit</em>. Any credits I have not spent remain
          refundable for 14 days.
        </Check>
      </fieldset>

      <p className="mt-4 flex items-start gap-2 text-xs text-bone-faint">
        <ShieldCheck size={13} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Payment is handled by Razorpay. We never see or store your card
          details. Your confirmations above are recorded with the date and the
          policy version in force.
        </span>
      </p>

      {error && <p className="mt-3 text-sm text-coral-soft">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startCheckout}
          disabled={!ready || status === "loading"}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-coral px-6 py-3 font-medium text-ink transition-colors hover:bg-coral-soft disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden /> Opening
              checkout…
            </>
          ) : (
            `Pay ${pack.price}`
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-ink-600 px-5 py-3 text-sm text-bone-dim transition-colors hover:border-bone-faint hover:text-bone"
          >
            Cancel
          </button>
        )}
      </div>

      {!ready && (
        <p className="mt-3 text-xs text-bone-faint">
          All three confirmations and a valid email are required before payment
          can start.
        </p>
      )}
    </div>
  );
}

function Check({
  checked,
  onChange,
  id,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-700 p-3 text-sm leading-relaxed text-bone-dim transition-colors hover:border-ink-600"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-coral"
      />
      <span>{children}</span>
    </label>
  );
}

/** Loads the Razorpay Checkout script once, then opens it. */
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as { Razorpay?: unknown }).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

async function openRazorpay(
  order: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    accountToken?: string;
  },
  email: string,
  setStatus: (s: "idle" | "loading" | "error") => void,
  setError: (s: string) => void
) {
  const loaded = await loadRazorpay();
  if (!loaded) {
    setStatus("error");
    setError("Could not load the payment window. Check your connection or ad blocker.");
    return;
  }

  const RazorpayCtor = (window as unknown as { Razorpay: new (o: unknown) => { open: () => void } })
    .Razorpay;

  const rzp = new RazorpayCtor({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    order_id: order.orderId,
    name: "CreatorsAI",
    description: "Credit pack",
    prefill: { email },
    theme: { color: "#ff5436" },
    handler: async (response: Record<string, string>) => {
      // This only confirms the payment for display. Credits are granted by the
      // signed webhook, so closing this tab does not lose the purchase.
      try {
        await fetch(`${API_BASE}/v1/checkout/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });
      } catch {
        /* the webhook is authoritative; nothing is lost */
      }
      window.location.href = "/checkout/success/";
    },
    modal: {
      ondismiss: () => setStatus("idle"),
    },
  });

  rzp.open();
}
