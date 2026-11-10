"use client";

import { useEffect, useState } from "react";
import { Card, Notice, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";

type A = { id: string; actorUid: string | null; actorRole: string; action: string; targetType: string; targetId: string; meta: Record<string, unknown>; at: string };

export default function AdminAudit() {
  const [items, setItems] = useState<A[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ items: A[] }>("/api/admin/audit")
      .then((r) => setItems(r.items))
      .catch((e) => {
        setError(e instanceof ApiClientError ? e.message : "Failed");
        setItems([]);
      });
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
      <p className="text-sm text-muted">Append-only. Latest 100 entries.</p>
      {error && <Notice tone="error">{error}</Notice>}
      {items === null ? (
        <Spinner />
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono text-xs">
              {items.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-4 py-2">{a.at ? new Date(a.at).toLocaleString("en-IN") : "—"}</td>
                  <td className="px-4 py-2">{a.action}</td>
                  <td className="px-4 py-2">{a.actorRole}{a.actorUid ? `:${a.actorUid.slice(0, 8)}` : ""}</td>
                  <td className="px-4 py-2">{a.targetType}:{a.targetId.slice(0, 12)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
