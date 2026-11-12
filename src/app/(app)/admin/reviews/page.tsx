"use client";

import { useCallback, useEffect, useState } from "react";
import { Stars } from "@/components/review-panel";
import { Badge, Button, Card, Notice, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";

type R = { id: string; rating: number; text: string; tags: string[]; reviewerName: string; via: string; dealTitle: string; hidden: boolean; reported: boolean; report?: { reason: string; note: string }; subjectUid: string; createdAt: string };

export default function AdminReviews() {
  const [data, setData] = useState<{ reported: R[]; latest: R[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => api<{ reported: R[]; latest: R[] }>("/api/admin/reviews").then(setData).catch((e) => setError(e instanceof ApiClientError ? e.message : "Failed to load")), []);
  useEffect(() => void load(), [load]);

  async function act(id: string, action: "hide" | "restore" | "dismiss_report") {
    try {
      await api(`/api/admin/reviews/${id}`, { method: "PATCH", body: { action } });
      await load();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Action failed");
    }
  }

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data) return <Spinner />;
  const Row = ({ r }: { r: R }) => (
    <li className="space-y-2 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Stars value={r.rating} size="text-sm" />
        <span className="text-sm font-medium">{r.reviewerName}</span>
        <span className="text-xs text-muted">{r.via === "link" ? "via link" : "member"} · {r.dealTitle}</span>
        {r.hidden && <Badge tone="red">Hidden</Badge>}
        {r.reported && <Badge tone="amber">Reported: {r.report?.reason}</Badge>}
      </div>
      {r.text && <p className="text-sm">“{r.text}”</p>}
      {r.report?.note && <p className="text-xs text-muted">Report note: {r.report.note}</p>}
      <div className="flex flex-wrap gap-2">
        {r.hidden ? <Button variant="secondary" onClick={() => act(r.id, "restore")}>Restore</Button> : <Button variant="secondary" onClick={() => act(r.id, "hide")}>Hide</Button>}
        {r.reported && <Button variant="ghost" onClick={() => act(r.id, "dismiss_report")}>Dismiss report</Button>}
      </div>
    </li>
  );
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
      <p className="text-sm text-muted">Every review comes from a deal both sides confirmed. Hide only what breaks the Community Guidelines — never because it is negative.</p>
      <Card>
        <h2 className="font-semibold">Reported ({data.reported.length})</h2>
        {data.reported.length ? <ul className="divide-y divide-line">{data.reported.map((r) => <Row key={r.id} r={r} />)}</ul> : <p className="mt-2 text-sm text-muted">Nothing to review.</p>}
      </Card>
      <Card>
        <h2 className="font-semibold">Latest</h2>
        <ul className="divide-y divide-line">{data.latest.map((r) => <Row key={r.id} r={r} />)}</ul>
      </Card>
    </div>
  );
}
