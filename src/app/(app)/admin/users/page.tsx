"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Notice, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { ROLE_LABELS, type Role } from "@/lib/config";

type U = { id: string; displayName: string; email: string; handle: string; role: Role; status: "active" | "suspended"; createdAt: string };

export default function AdminUsers() {
  const [items, setItems] = useState<U[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (after?: string) => {
    try {
      const r = await api<{ items: U[]; nextCursor: string | null }>(`/api/admin/users${after ? `?cursor=${after}` : ""}`);
      setItems((cur) => (after && cur ? [...cur, ...r.items] : r.items));
      setCursor(r.nextCursor);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load");
      setItems((cur) => cur ?? []);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(u: U, action: "suspend" | "reactivate") {
    const reason = window.prompt(`Reason to ${action} ${u.displayName} (recorded in the audit log):`);
    if (!reason || reason.trim().length < 5) return;
    setBusy(u.id);
    setError(null);
    try {
      const r = await api<{ status: U["status"] }>(`/api/admin/users/${u.id}`, { method: "PATCH", body: { action, reason } });
      setItems((cur) => cur?.map((x) => (x.id === u.id ? { ...x, status: r.status } : x)) ?? null);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
      {error && <Notice tone="error">{error}</Notice>}
      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card><p className="text-sm text-muted">No members yet.</p></Card>
      ) : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.displayName}</p>
                    <p className="text-xs text-muted">{u.email} · /p/{u.handle}</p>
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-3">{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3"><Badge tone={u.status === "active" ? "green" : "red"}>{u.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {u.status === "active" ? (
                      <Button variant="ghost" onClick={() => setStatus(u, "suspend")} disabled={busy === u.id}>Suspend</Button>
                    ) : (
                      <Button variant="secondary" onClick={() => setStatus(u, "reactivate")} disabled={busy === u.id}>Reactivate</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {cursor && <Button variant="secondary" onClick={() => load(cursor)}>Load more</Button>}
    </div>
  );
}
