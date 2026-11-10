"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Notice, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";

type R = { id: string; uid: string; email: string | null; type: string; details: string; createdAt: string };

export default function AdminRequests() {
  const [items, setItems] = useState<R[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ items: R[] }>("/api/admin/requests")
      .then((r) => setItems(r.items))
      .catch((e) => {
        setError(e instanceof ApiClientError ? e.message : "Failed");
        setItems([]);
      });
  }, []);

  async function resolve(r: R) {
    const note = window.prompt("Resolution note (shown to the user):");
    if (!note || note.trim().length < 5) return;
    try {
      await api(`/api/admin/requests/${r.id}`, { method: "PATCH", body: { resolutionNote: note } });
      setItems((cur) => cur?.filter((x) => x.id !== r.id) ?? null);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Open data requests</h1>
      <Notice tone="info">
        Acknowledge within 24 hours. For deletion: delete the user&apos;s profile, handle, social accounts and auth account; keep audit and consent records required for
        compliance. Record what you did in the resolution note.
      </Notice>
      {error && <Notice tone="error">{error}</Notice>}
      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card><p className="text-sm text-muted">No open requests.</p></Card>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id}>
              <Card className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{r.email ?? r.uid}</p>
                  <Badge tone={r.type === "deletion" ? "red" : "amber"}>{r.type}</Badge>
                </div>
                <p className="text-sm text-muted">{new Date(r.createdAt).toLocaleString("en-IN")} · uid {r.uid}</p>
                {r.details && <p className="text-sm">{r.details}</p>}
                <Button variant="secondary" onClick={() => resolve(r)}>Mark resolved</Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
