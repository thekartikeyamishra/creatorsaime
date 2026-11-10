"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Notice, Spinner, cx } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";

type Item = Record<string, unknown> & { id: string; uid: string; updatedAt: string };

export default function AdminVerifications() {
  const [kind, setKind] = useState<"social" | "brand">("social");
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    setError(null);
    try {
      const r = await api<{ items: Item[] }>(`/api/admin/verifications?kind=${kind}&status=pending_review`);
      setItems(r.items);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Failed to load");
      setItems([]);
    }
  }, [kind]);
  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, action: "verify" | "reject") {
    const note = action === "reject" ? window.prompt("Reason shown to the user (required):") : window.prompt("Evidence note (optional):") ?? "";
    if (action === "reject" && !note) return;
    if (note === null) return;
    setBusy(id);
    setError(null);
    try {
      await api(`/api/admin/verifications/${id}`, { method: "PATCH", body: { kind, action, note } });
      setItems((cur) => cur?.filter((x) => x.id !== id) ?? null);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Verification queue</h1>
      <div className="flex gap-2">
        {(["social", "brand"] as const).map((k) => (
          <button key={k} onClick={() => setKind(k)} className={cx("rounded-full px-3 py-1.5 text-sm ring-1", kind === k ? "bg-ink text-white ring-ink" : "bg-white ring-line")}>
            {k === "social" ? "Social accounts" : "Businesses"}
          </button>
        ))}
      </div>
      <Notice tone="info">
        {kind === "social"
          ? "Open the profile and confirm the exact verification code appears in its bio. Check the account looks authentic (history, engagement consistency). Never verify from screenshots."
          : "Check the business exists (website, GSTIN on the GST portal, Google listing) and that the representative's email/phone belong to it. Call if in doubt."}
      </Notice>
      {error && <Notice tone="error">{error}</Notice>}
      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card><p className="text-sm text-muted">Queue is empty. 🎉</p></Card>
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.id}>
              <Card className="space-y-2">
                {kind === "social" ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold capitalize">{String(i.platform)} · @{String(i.handle).replace(/^@/, "")}</p>
                      <Badge tone="amber">Code: <span className="ml-1 font-mono">{String(i.verificationCode)}</span></Badge>
                    </div>
                    <a href={String(i.url)} target="_blank" rel="noopener noreferrer nofollow" className="block break-all text-sm text-brand hover:underline">{String(i.url)}</a>
                    <p className="text-xs text-muted">
                      Self-reported followers: {i.followerCountSelfReported == null ? "—" : Number(i.followerCountSelfReported).toLocaleString("en-IN")} · user {i.uid}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">{String(i.legalName)}</p>
                    <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      <div><dt className="inline text-muted">Representative: </dt><dd className="inline">{String(i.representativeName)} ({String(i.representativeRole)})</dd></div>
                      <div><dt className="inline text-muted">Email: </dt><dd className="inline">{String(i.businessEmail)}</dd></div>
                      <div><dt className="inline text-muted">Phone: </dt><dd className="inline">{String(i.businessPhone)}</dd></div>
                      <div><dt className="inline text-muted">GSTIN: </dt><dd className="inline">{String(i.gstin || "—")}</dd></div>
                      <div className="sm:col-span-2"><dt className="inline text-muted">Address: </dt><dd className="inline">{String(i.registeredAddress)}</dd></div>
                      {Boolean(i.website) && (
                        <div className="sm:col-span-2">
                          <a href={String(i.website)} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-brand hover:underline">{String(i.website)}</a>
                        </div>
                      )}
                    </dl>
                  </>
                )}
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => decide(i.id, "verify")} loading={busy === i.id}>Verify</Button>
                  <Button variant="ghost" onClick={() => decide(i.id, "reject")} disabled={busy === i.id}>Reject</Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
