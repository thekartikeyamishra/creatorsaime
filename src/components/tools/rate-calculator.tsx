"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { estimateRate, NICHES, RATE_FORMATS, type Niche, type RateFormat } from "@/lib/tools";
import { inr, L, NextStep, Num, Panel, Pick, Toggle, useSaved } from "./kit";

const INITIAL = { format: "ig_reel" as RateFormat, avgViews: 10000, niche: "food" as Niche, usageMonths: 0, exclusivity: false, cpmLow: 0, cpmHigh: 0 };

export function RateCalculator() {
  const [s, set] = useSaved("rate-calculator", INITIAL);
  const [copied, setCopied] = useState(false);
  const d = useDeferredValue(s);
  const r = useMemo(() => estimateRate(d), [d]);
  const up = <K extends keyof typeof INITIAL>(k: K, v: (typeof INITIAL)[K]) => set((p) => ({ ...p, [k]: v }));
  const script = `Hi! My fee for one ${RATE_FORMATS[s.format].label} is ${inr(r.mid)}. My recent posts average ${s.avgViews.toLocaleString("en-IN")} views${
    s.usageMonths ? `, and this includes ${s.usageMonths} months of paid usage rights` : ""
  }. 50% advance, balance within 7 days of the post going live. Happy to share recent results.`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Panel>
        <div className="grid gap-5 sm:grid-cols-2">
          <L label="Format" htmlFor="rc-format">
            <Pick id="rc-format" value={s.format} onChange={(v) => up("format", v)} options={Object.entries(RATE_FORMATS).map(([k, v]) => [k as RateFormat, v.label])} />
          </L>
          <L label="Your niche" htmlFor="rc-niche">
            <Pick id="rc-niche" value={s.niche} onChange={(v) => up("niche", v)} options={Object.entries(NICHES).map(([k, v]) => [k as Niche, v.label])} />
          </L>
          <L label="Average views per post" htmlFor="rc-views" hint="Use the median of your last 10 posts — not followers, not your best post.">
            <Num id="rc-views" value={s.avgViews} onChange={(v) => up("avgViews", v)} max={50_000_000} step={100} />
          </L>
          <L label="Paid usage rights (months)" htmlFor="rc-usage" hint="If the brand will run your video as their ad.">
            <Num id="rc-usage" value={s.usageMonths} onChange={(v) => up("usageMonths", Math.round(v))} max={24} />
          </L>
        </div>
        <div className="mt-5"><Toggle checked={s.exclusivity} onChange={(v) => up("exclusivity", v)} label="Category exclusivity (no competing brands for the campaign period)" /></div>
        <details className="mt-5 rounded-xl bg-paper p-4 text-sm">
          <summary className="cursor-pointer font-medium">Adjust the ₹ per 1,000 views assumption</summary>
          <p className="mt-2 text-muted">Default for this format: ₹{RATE_FORMATS[s.format].cpm[0]}–₹{RATE_FORMATS[s.format].cpm[1]}. If you know your local market, set your own.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <L label="Low" htmlFor="rc-lo"><Num id="rc-lo" prefix="₹" value={s.cpmLow} onChange={(v) => up("cpmLow", v)} max={10000} /></L>
            <L label="High" htmlFor="rc-hi"><Num id="rc-hi" prefix="₹" value={s.cpmHigh} onChange={(v) => up("cpmHigh", v)} max={10000} /></L>
          </div>
        </details>
      </Panel>

      <div className="space-y-4" aria-live="polite">
        <Panel className="bg-gradient-to-br from-white to-blue-50/60">
          <p className="text-sm text-muted">Suggested fee</p>
          <p key={r.mid} className="fx-pop mt-1 text-5xl font-semibold tracking-tight tabular-nums">{inr(r.mid)}</p>
          <p className="mt-2 text-sm text-ink-2">Fair range <b className="tabular-nums">{inr(r.low)} – {inr(r.high)}</b></p>
          <ul className="mt-4 space-y-1 text-xs text-muted">
            {r.breakdown.map((b) => <li key={b}>• {b}</li>)}
          </ul>
        </Panel>
        <Panel>
          <p className="text-sm font-medium">Quote message you can send</p>
          <p className="mt-2 rounded-xl bg-paper p-3 text-sm leading-6">{script}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(script).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})}
            className="mt-3 rounded-lg px-3 py-1.5 text-sm font-medium text-brand ring-1 ring-blue-200 hover:bg-blue-50"
          >
            {copied ? "Copied ✓" : "Copy message"}
          </button>
        </Panel>
      </div>
      <div className="lg:col-span-2">
        <NextStep from="rate-calculator" title="Quoted it? Now make sure you actually get paid." body="Log the deal in CreatorsAI's free Deal Desk — even if the brand isn't on CreatorsAI. Both sides confirm the terms, overdue payments get flagged and polite WhatsApp reminders go out in Hindi or English." />
      </div>
    </div>
  );
}
