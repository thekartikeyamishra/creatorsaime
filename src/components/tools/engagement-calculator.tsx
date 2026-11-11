"use client";

import { useMemo } from "react";
import { engagement } from "@/lib/tools";
import { L, NextStep, Num, Panel, useSaved } from "./kit";

const INITIAL = { likes: 420, comments: 36, saves: 28, shares: 15, followers: 12000, views: 18000 };
const BAND = {
  low: ["Below 1%", "Your audience mostly scrolls past. Brands will judge you on views, not followers — post fewer, stronger pieces and use clearer hooks."],
  average: ["1–3%", "Healthy for most accounts. Lead with your views and one concrete result (clicks, footfall, coupon uses) when pitching."],
  strong: ["3–6%", "Strong. You have pricing power — quote from the upper half of your range."],
  exceptional: ["Above 6%", "Exceptional for brand work. Check one viral post isn't skewing it; if it holds across 10 posts, raise your rates."],
} as const;

export function EngagementCalculator() {
  const [s, set] = useSaved("engagement-rate-calculator", INITIAL);
  const r = useMemo(() => engagement(s), [s]);
  const up = (k: keyof typeof INITIAL) => (v: number) => set((p) => ({ ...p, [k]: v }));
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <Panel>
        <p className="mb-4 text-sm text-muted">Add up the last 10 posts (or enter one post) — interactions and views from the same posts.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <L label="Likes" htmlFor="er-l"><Num id="er-l" value={s.likes} onChange={up("likes")} /></L>
          <L label="Comments" htmlFor="er-c"><Num id="er-c" value={s.comments} onChange={up("comments")} /></L>
          <L label="Saves" htmlFor="er-s"><Num id="er-s" value={s.saves} onChange={up("saves")} /></L>
          <L label="Shares" htmlFor="er-sh"><Num id="er-sh" value={s.shares} onChange={up("shares")} /></L>
          <L label="Followers" htmlFor="er-f"><Num id="er-f" value={s.followers} onChange={up("followers")} /></L>
          <L label="Views / reach" htmlFor="er-v" hint="Optional, but brands trust this more."><Num id="er-v" value={s.views} onChange={up("views")} /></L>
        </div>
      </Panel>
      <div className="space-y-4" aria-live="polite">
        <Panel className="bg-gradient-to-br from-white to-teal-50/60">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted">By followers</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">{r.byFollowers === null ? "—" : `${r.byFollowers}%`}</p>
            </div>
            <div>
              <p className="text-sm text-muted">By views</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">{r.byViews === null ? "—" : `${r.byViews}%`}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">{r.interactions.toLocaleString("en-IN")} interactions</p>
        </Panel>
        {r.band && (
          <Panel>
            <p className="text-sm font-semibold">{BAND[r.band][0]}</p>
            <p className="mt-1 text-sm leading-6 text-ink-2">{BAND[r.band][1]}</p>
            <p className="mt-3 text-xs text-muted">Rough guide only — rates vary by platform, niche and account size. Smaller accounts usually score higher.</p>
          </Panel>
        )}
      </div>
      <div className="lg:col-span-2">
        <NextStep from="engagement" title="Turn engagement into proof brands trust." body="On CreatorsAI, every deal both sides confirm builds a verified track record — on-time delivery, repeat clients, real results — that screenshots can't fake." />
      </div>
    </div>
  );
}
