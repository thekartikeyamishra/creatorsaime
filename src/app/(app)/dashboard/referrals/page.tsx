"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Notice, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { shareText, type Ambassador } from "@/lib/referrals";

type Data = {
  code: string;
  link: string;
  role: "creator" | "brand" | "professional";
  stats: { joined: number; qualified: number; growthDaysEarned: number; rewardsLeftThisYear: number };
  ambassador: Ambassador;
  referrals: Array<{ name: string; role: string; status: "joined" | "qualified"; rewarded: boolean; joinedAt: string | null }>;
  rules: { brandTrialDays: number; rewardDays: { brand_first_payment: number; creator_first_verified_deal: number }; maxRewardsPerYear: number };
};

export default function ReferralsPage() {
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<Data>("/api/referrals").then(setD).catch((e) => setError(e instanceof ApiClientError ? e.message : "Could not load your invite link."));
  }, []);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!d) return <Spinner />;
  const brand = d.role === "brand";
  const text = shareText("", d.link, d.role);
  const copy = () =>
    navigator.clipboard
      ?.writeText(d.link)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invite & earn</h1>
        <p className="mt-1 text-muted">
          {brand
            ? `Invite brands and creators you trust. You earn free Growth days when they get real results.`
            : `Invite the brands you work with and fellow creators. Brands you invite get ${d.rules.brandTrialDays} days of Growth free — and you build Ambassador status.`}
        </p>
      </div>

      <Card className="space-y-4 bg-gradient-to-br from-white to-blue-50/60">
        <p className="text-sm font-medium">Your personal link</p>
        <div className="flex flex-wrap gap-2">
          <code className="flex-1 truncate rounded-xl bg-white px-4 py-3 text-[15px] ring-1 ring-line">{d.link}</code>
          <Button onClick={copy}>{copied ? "Copied ✓" : "Copy link"}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <a data-magnetic href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white">Share on WhatsApp</a>
          <a href={`https://x.com/intent/post?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white">Share on X</a>
          <a href={`mailto:?subject=${encodeURIComponent("Join me on CreatorsAI")}&body=${encodeURIComponent(text)}`} className="rounded-xl px-4 py-2.5 text-sm font-medium ring-1 ring-line">Email</a>
        </div>
        <p className="text-xs text-muted">Tip: every deal link you send a client already carries your invite — when they join, it counts.</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-muted">Joined with your link</p><p className="mt-1 text-3xl font-semibold tabular-nums">{d.stats.joined}</p></Card>
        <Card><p className="text-sm text-muted">Got real results</p><p className="mt-1 text-3xl font-semibold tabular-nums">{d.stats.qualified}</p></Card>
        <Card>
          {brand ? (
            <><p className="text-sm text-muted">Growth days earned</p><p className="mt-1 text-3xl font-semibold tabular-nums">{d.stats.growthDaysEarned}</p></>
          ) : (
            <><p className="text-sm text-muted">Ambassador status</p><p className="mt-1 text-xl font-semibold">{d.ambassador.title ?? "Not yet"}</p>{d.ambassador.next && <p className="text-xs text-muted">{d.ambassador.next - d.stats.qualified} more to the next level</p>}</>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold">How rewards work</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-ink-2">
          <li>A <b>brand</b> joining with your link gets <b>{d.rules.brandTrialDays} days of Growth free</b>.</li>
          <li>It counts when a brand you invited <b>makes its first payment</b>, or a creator you invited <b>completes their first deal confirmed by both sides</b>.</li>
          {brand ? (
            <li>You earn <b>+{d.rules.rewardDays.brand_first_payment} Growth days</b> per brand and <b>+{d.rules.rewardDays.creator_first_verified_deal}</b> per creator — added on top of your current plan.</li>
          ) : (
            <li>You earn Ambassador status on your public profile: <b>Ambassador</b> (1), <b>Community Builder</b> (3), <b>Founding Ambassador</b> (10).</li>
          )}
          <li>Up to {d.rules.maxRewardsPerYear} rewards a year ({d.stats.rewardsLeftThisYear} left this year). Rewards can&apos;t be exchanged for cash. Self-referrals don&apos;t count.</li>
        </ul>
      </Card>

      <Card>
        <h2 className="font-semibold">People you invited</h2>
        {d.referrals.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No one yet. Send your link to one brand you&apos;ve worked with — it takes them 30 seconds to join.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {d.referrals.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span><b>{r.name}</b> <span className="text-muted">· {r.role}{r.joinedAt ? ` · joined ${new Date(r.joinedAt).toLocaleDateString("en-IN")}` : ""}</span></span>
                <Badge tone={r.status === "qualified" ? "green" : "slate"}>{r.status === "qualified" ? (r.rewarded ? "Rewarded" : "Counted") : "Joined"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
