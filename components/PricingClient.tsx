"use client";

import { useState } from "react";
import CheckoutConsent, { type Pack } from "./CheckoutConsent";

/**
 * Display prices only. The server independently looks up the real price and
 * credit count from its own table, so tampering with anything here changes
 * nothing about what is charged or granted.
 */
const PACKS: Pack[] = [
  { id: "starter", credits: 100, label: "Starter", price: "$12.99" },
  { id: "creator", credits: 350, label: "Creator", price: "$39.99" },
  { id: "studio", credits: 1000, label: "Studio", price: "$99.99" },
];

export default function PricingClient() {
  const [selected, setSelected] = useState<Pack | null>(null);

  if (selected) {
    return (
      <div className="mt-10">
        <CheckoutConsent pack={selected} onCancel={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-4 sm:grid-cols-3">
      {PACKS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => setSelected(p)}
          className="rounded-2xl border border-ink-700 bg-ink-800/60 p-6 text-left transition-colors hover:border-coral/50"
        >
          <h2 className="font-display text-2xl text-bone">{p.label}</h2>
          <p className="mt-1 text-3xl text-coral">{p.price}</p>
          <p className="mt-2 text-sm text-bone-dim">{p.credits} credits</p>
          <p className="mt-4 text-sm text-coral">Choose →</p>
        </button>
      ))}
    </div>
  );
}
