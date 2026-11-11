"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Notice, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import type { CheckStatus, ProbeResult, SetupReport } from "@/lib/setup-check";

type Data = SetupReport & { probes: ProbeResult[] | null; deployment: string; generatedAt: string };

const TONE: Record<CheckStatus, { tone: "green" | "red" | "amber" | "slate"; text: string }> = {
  ok: { tone: "green", text: "Ready" },
  missing: { tone: "red", text: "Missing" },
  invalid: { tone: "red", text: "Invalid" },
  warn: { tone: "amber", text: "Check" },
  off: { tone: "slate", text: "Optional · off" },
};

export default function SetupCheckPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);

  const load = useCallback(async (probe: boolean) => {
    setError(null);
    if (probe) setProbing(true);
    try {
      setData(await api<Data>(`/api/admin/setup${probe ? "?probe=1" : ""}`));
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load");
    } finally {
      setProbing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data) return <Spinner />;
  const { summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Setup check</h1>
          <p className="mt-1 text-sm text-muted">
            Environment: <b>{data.deployment}</b> · values are never shown, only whether they are set and valid.
          </p>
        </div>
        <Button onClick={() => void load(true)} loading={probing}>
          Test live connections
        </Button>
      </div>

      {summary.ready ? (
        <Notice tone="success">
          All required settings are in place ({summary.ok} ready{summary.warnings ? `, ${summary.warnings} to review` : ""}).
        </Notice>
      ) : (
        <Notice tone="warn">
          {summary.problems} setting{summary.problems > 1 ? "s" : ""} need attention. Fix them in Vercel → Settings → Environment Variables, then redeploy.
        </Notice>
      )}

      {data.probes && (
        <Card>
          <h2 className="font-semibold">Live connection tests</h2>
          <ul className="mt-3 divide-y divide-line">
            {data.probes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="font-medium">{p.label}</span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-muted">{p.detail}</span>
                  <Badge tone={p.ok ? "green" : "red"}>{p.ok ? "Working" : "Failing"}</Badge>
                  <span className="tabular-nums text-xs text-muted">{p.ms} ms</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Read-only checks: nothing is charged, sent or written.</p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {data.groups.map((g) => {
          const bad = g.items.some((i) => i.status === "missing" || i.status === "invalid");
          return (
            <Card key={g.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{g.title}</h2>
                  <p className="text-xs text-muted">Powers: {g.impact}</p>
                </div>
                <Badge tone={bad ? "red" : "green"}>{bad ? "Action needed" : "OK"}</Badge>
              </div>
              <ul className="mt-3 space-y-2">
                {g.items.map((i) => (
                  <li key={i.key} className="rounded-xl bg-paper px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm">
                        {i.label} <code className="ml-1 text-xs text-muted">{i.key}</code>
                      </span>
                      <Badge tone={TONE[i.status].tone}>{TONE[i.status].text}</Badge>
                    </div>
                    {i.hint && i.status !== "ok" && <p className="mt-1 text-xs text-muted">{i.hint}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted">Checked {new Date(data.generatedAt).toLocaleString("en-IN")}</p>
    </div>
  );
}
