"use client";

import { useDeferredValue, useMemo } from "react";
import { checkDisclosure } from "@/lib/tools";
import { NextStep, Panel, useSaved } from "./kit";

export function DisclosureChecker() {
  const [s, set] = useSaved("ad-disclosure-checker", { caption: "Weekend sorted 😍 Trying the new Diwali menu at Spice Route! #foodie #prayagraj #collab" });
  const d = useDeferredValue(s.caption);
  const r = useMemo(() => checkDisclosure(d), [d]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel>
        <label htmlFor="dc" className="text-sm font-medium">Paste your caption or video description</label>
        <textarea id="dc" rows={8} maxLength={5000} value={s.caption} onChange={(e) => set({ caption: e.target.value })} className="mt-2 block w-full resize-y rounded-xl bg-white px-3.5 py-3 text-[15px] leading-6 ring-1 ring-line focus:ring-2 focus:ring-brand focus:outline-none" />
        <p className="mt-2 text-xs text-muted">Checked on your device — nothing is uploaded.</p>
      </Panel>
      <div className="space-y-4" aria-live="polite">
        <Panel className={r.ok ? "bg-emerald-50/70 ring-emerald-200" : "bg-amber-50/70 ring-amber-200"}>
          <p className="text-2xl font-semibold">{r.ok ? "✓ Looks properly disclosed" : "Needs a clearer disclosure"}</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>{r.found.length ? "✓" : "✗"} Permitted label: {r.found.length ? r.found.map((f) => `“${f}”`).join(", ") : "none found"}</li>
            <li>{r.upfront ? "✓" : "✗"} Visible upfront (first lines, before “more”)</li>
            <li>{r.buriedInHashtags ? "✗ Hidden among other hashtags" : "✓ Not buried among hashtags"}</li>
          </ul>
        </Panel>
        <Panel>
          <p className="text-sm font-semibold">How to fix</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6">
            {r.tips.map((t) => <li key={t}>{t}</li>)}
          </ul>
          <p className="mt-3 text-xs text-muted">A helper, not legal advice. Labels checked: Advertisement, Ad, Sponsored, Collaboration, Partnership, Employee, Free gift.</p>
        </Panel>
      </div>
      <div className="lg:col-span-2">
        <NextStep from="disclosure" title="Brands rebook creators who make them look good." body="CreatorsAI agreements include the disclosure clause by default, so both sides know exactly what's expected before anyone posts." />
      </div>
    </div>
  );
}
