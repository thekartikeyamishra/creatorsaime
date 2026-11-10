"use client";

import { useState, type FormEvent } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import { PAYMENT_METHODS } from "@/lib/config";
import { formatInr, received, todayIST, type Deal } from "@/lib/deals";
import { payoutLines } from "@/lib/pods";
import { Badge, Button, Card, Field, Input, Notice, Select } from "./ui";

/**
 * Pod coordination on a deal. Lead: assign work + record payouts. Members: see their share,
 * update their own deliverables and confirm payouts. Brand: read-only transparency.
 */
export function PodPanel({ deal, myUid, onChange }: { deal: Deal; myUid: string; onChange: (d: Deal) => void }) {
  const pod = deal.pod!;
  const isLead = pod.leadUid === myUid;
  const isMember = pod.members.some((m) => m.uid === myUid);
  const payouts = deal.payouts ?? [];
  const lines = payoutLines(pod, deal.feeAmount, received(deal), payouts);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const nameOf = (uid?: string) => pod.members.find((m) => m.uid === uid)?.name ?? "Lead (default)";

  async function act(body: Record<string, unknown>, key: string, success?: string) {
    setBusy(key);
    setMsg(null);
    try {
      const r = await api<{ item: Deal }>(`/api/deals/${deal.id}/pod`, { method: "PATCH", body });
      onChange(r.item);
      if (success) setMsg({ tone: "success", text: success });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiClientError ? Object.values(e.fields)[0] ?? e.message : "Failed" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Pod: {pod.name}</h2>
        <Badge tone="blue">{pod.members.length} members</Badge>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Who does what</h3>
        <ul className="mt-2 divide-y divide-line">
          {deal.deliverables.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
              <span>
                {d.qty}× {d.type}
                {d.dueDate && <span className="text-muted"> · due {d.dueDate}</span>}
              </span>
              {isLead && deal.status === "active" ? (
                <select
                  aria-label="Assign to"
                  value={d.assigneeUid ?? ""}
                  disabled={busy !== null}
                  onChange={(e) => act({ action: "assign_deliverable", deliverableId: d.id, assigneeUid: e.target.value }, `as-${d.id}`)}
                  className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-line"
                >
                  <option value="">Lead (default)</option>
                  {pod.members.filter((m) => m.uid !== pod.leadUid).map((m) => <option key={m.uid} value={m.uid}>{m.name} · {m.role}</option>)}
                </select>
              ) : (
                <Badge tone={d.assigneeUid === myUid ? "teal" : "slate"}>{d.assigneeUid === myUid ? "You" : nameOf(d.assigneeUid)}</Badge>
              )}
            </li>
          ))}
        </ul>
      </div>

      {deal.feeAmount > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">Split ledger</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="text-muted">
                <tr><th className="py-2 font-medium">Member</th><th className="py-2 font-medium">Share</th><th className="py-2 font-medium">Of fee</th><th className="py-2 font-medium">Due so far</th><th className="py-2 font-medium">Paid out</th><th className="py-2 font-medium">Owed now</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((l) => (
                  <tr key={l.uid} className={l.uid === myUid ? "bg-blue-50/40" : ""}>
                    <td className="py-2">{l.name}{l.uid === pod.leadUid ? " (lead)" : ""}<span className="block text-xs text-muted">{l.role}</span></td>
                    <td className="py-2">{l.sharePct}%</td>
                    <td className="py-2 tabular-nums">{formatInr(l.entitledOnFee)}</td>
                    <td className="py-2 tabular-nums">{formatInr(l.entitledSoFar)}</td>
                    <td className="py-2 tabular-nums">{l.uid === pod.leadUid ? "kept" : formatInr(l.paidOut)}</td>
                    <td className="py-2 tabular-nums font-medium">{l.uid === pod.leadUid ? "—" : l.owedNow > 0 ? <span className="text-amber-700">{formatInr(l.owedNow)}</span> : "✓"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">The brand pays the lead; the lead pays members their share of whatever the brand has paid so far. Members confirm receipt below.</p>
        </div>
      )}

      {payouts.length > 0 && (
        <ul className="divide-y divide-line text-sm">
          {payouts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{formatInr(p.amount)} → {nameOf(p.toUid)} · {p.method} · {p.date}{p.note && <span className="text-muted"> · {p.note}</span>}</span>
              {p.confirmedAt ? (
                <Badge tone="green">Received ✓</Badge>
              ) : p.toUid === myUid ? (
                <Button onClick={() => act({ action: "confirm_payout", payoutId: p.id }, `cf-${p.id}`, "Thanks — confirmed.")} loading={busy === `cf-${p.id}`}>I received this</Button>
              ) : (
                <Badge tone="amber">Awaiting confirmation</Badge>
              )}
            </li>
          ))}
        </ul>
      )}

      {isLead && deal.feeAmount > 0 && deal.status !== "cancelled" && lines.some((l) => l.uid !== pod.leadUid && l.paidOut < l.entitledOnFee) && (
        <PayoutForm members={lines.filter((l) => l.uid !== pod.leadUid)} busy={busy === "payout"} onSubmit={(b) => act({ action: "record_payout", ...b }, "payout", "Payout recorded — they'll be asked to confirm.")} />
      )}
      {!isLead && !isMember && <p className="text-xs text-muted">You&apos;re seeing the pod&apos;s split for transparency. You pay the pod lead; the pod handles the rest.</p>}
    </Card>
  );
}

function PayoutForm({ members, onSubmit, busy }: { members: Array<{ uid: string; name: string; owedNow: number }>; onSubmit: (b: { toUid: string; amount: number; date: string; method: string; note: string }) => void; busy: boolean }) {
  const [to, setTo] = useState(members.find((m) => m.owedNow > 0)?.uid ?? members[0]!.uid);
  const owed = members.find((m) => m.uid === to)?.owedNow ?? 0;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({ toUid: to, amount: Math.floor(Number(fd.get("amount")) || 0), date: String(fd.get("date")), method: String(fd.get("method")), note: String(fd.get("note") ?? "") });
  }
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl bg-paper p-4 ring-1 ring-line sm:grid-cols-5 sm:items-end">
      <Field label="Pay" htmlFor="to">
        <select id="to" value={to} onChange={(e) => setTo(e.target.value)} className="block w-full rounded-xl bg-white px-3 py-2.5 text-sm ring-1 ring-line">
          {members.map((m) => <option key={m.uid} value={m.uid}>{m.name}</option>)}
        </select>
      </Field>
      <Field label="Amount (₹)" htmlFor="amount"><Input key={to} id="amount" name="amount" type="number" min={1} defaultValue={owed || undefined} required /></Field>
      <Field label="Date" htmlFor="pdate"><Input id="pdate" name="date" type="date" defaultValue={todayIST()} required /></Field>
      <Field label="Method" htmlFor="pmethod"><Select id="pmethod" name="method" options={PAYMENT_METHODS} /></Field>
      <Button type="submit" loading={busy}>Record payout</Button>
      <input type="hidden" name="note" value="" />
    </form>
  );
}
