"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, Notice, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { ROLE_LABELS, ROLES } from "@/lib/config";

type Stats = {
  waitlist: { total: number; pending: number; invited: number; joined: number; inCohortCity: number; byRole: Record<string, number> };
  members: number;
  activity: { openCampaigns: number; deals: number; verifiedDeals: number; whatsapp30: number };
  revenue: { totalPaise: number; last30Paise: number; paidOrders: number; activeGrowth: number; pilotsOpen: number };
  queues: { socialPending: number; brandPending: number; openRequests: number };
  generatedAt: string;
};

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Stats>("/api/admin/stats")
      .then(setStats)
      .catch((e) => setError(e instanceof ApiClientError ? e.message : "Failed to load"));
  }, []);
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!stats) return <Spinner />;
  const s = stats;
  const inr = (p: number) => `₹${Math.round(p / 100).toLocaleString("en-IN")}`;
  const money: Array<[string, string]> = [
    ["Revenue (last 30 days)", inr(s.revenue.last30Paise)],
    ["Revenue (all time)", inr(s.revenue.totalPaise)],
    ["Active Growth brands", String(s.revenue.activeGrowth)],
    ["Managed Pilots to start", String(s.revenue.pilotsOpen)],
  ];
  const tiles: Array<[string, number, string?]> = [
    ["Waitlist total", s.waitlist.total, "/admin/waitlist"],
    ["Pending review", s.waitlist.pending, "/admin/waitlist"],
    ["Invited (not joined)", s.waitlist.invited],
    ["Members", s.members, "/admin/users"],
    ["In cohort cities", s.waitlist.inCohortCity],
    ["Social verifications waiting", s.queues.socialPending, "/admin/verifications"],
    ["Brand verifications waiting", s.queues.brandPending, "/admin/verifications"],
    ["Open data requests", s.queues.openRequests, "/admin/requests"],
    ["Open campaigns", s.activity.openCampaigns],
    ["Deals logged", s.activity.deals],
    ["Verified completed deals", s.activity.verifiedDeals],
    ["WhatsApp messages (30 days)", s.activity.whatsapp30],
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Founder overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {money.map(([label, value]) => (
          <Card key={label} className="ring-teal/40">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>
      {s.revenue.pilotsOpen > 0 && <Notice tone="warn">{s.revenue.pilotsOpen} Managed Pilot{s.revenue.pilotsOpen > 1 ? "s" : ""} paid and waiting — contact the brand within one business day (see Audit log / Firestore managedRequests).</Notice>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([label, value, href]) => {
          const inner = (
            <Card className="h-full">
              <p className="text-sm text-muted">{label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{value.toLocaleString("en-IN")}</p>
            </Card>
          );
          return href ? <Link key={label} href={href} className="block hover:opacity-90">{inner}</Link> : <div key={label}>{inner}</div>;
        })}
      </div>
      <Card>
        <h2 className="font-semibold">Waitlist by role</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {ROLES.map((r) => (
            <li key={r} className="rounded-xl bg-paper px-4 py-3">
              <span className="text-sm text-muted">{ROLE_LABELS[r]}</span>
              <p className="text-xl font-semibold tabular-nums">{s.waitlist.byRole[r] ?? 0}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          Validation targets: 50 verified creators · 10 qualified brands · 3 paid pilots. Waitlist size is not product-market fit — a brand paying twice is.
        </p>
      </Card>
      <p className="text-xs text-muted">Generated {new Date(s.generatedAt).toLocaleString("en-IN")}</p>
    </div>
  );
}
