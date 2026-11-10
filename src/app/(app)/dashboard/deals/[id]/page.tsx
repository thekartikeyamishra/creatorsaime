"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { TermsEditor, Textish, termsFromDeal, toTermsPayload, type TermsValue } from "@/components/deal-forms";
import { PodPanel } from "@/components/pod-panel";
import { useLocale } from "@/components/locale-provider";
import { statusLabel } from "@/lib/i18n";
import { Badge, Button, Card, Field, Input, Notice, Select, Spinner, cx } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth-context";
import { COMPENSATION_LABELS, PAYMENT_METHODS, site } from "@/lib/config";
import {
  balance,
  deliverableReminderText,
  formatInr,
  isPaymentOverdue,
  paymentReminderText,
  received,
  roi,
  sideOf,
  todayIST,
  upiLink,
  whatsappLink,
  type Deal,
} from "@/lib/deals";

type ClientDeal = Deal & { verifiedCompletion: boolean; hasShareLink: boolean; cancelReason?: string };
type Billing = { upiId?: string; legalName?: string } | null;

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const { t, locale } = useLocale();
  const [deal, setDeal] = useState<ClientDeal | null>(null);
  const [billing, setBilling] = useState<Billing>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ item: ClientDeal }>(`/api/deals/${id}`);
      setDeal(r.item);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not load deal");
    }
  }, [id]);
  useEffect(() => {
    void load();
    api<{ billing: Billing }>("/api/billing").then((r) => setBilling(r.billing)).catch(() => undefined);
  }, [load]);

  async function act(action: Record<string, unknown>, key: string, success?: string): Promise<boolean> {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const r = await api<{ item: ClientDeal; shareUrl: string | null }>(`/api/deals/${id}`, { method: "PATCH", body: action });
      setDeal(r.item);
      if (r.shareUrl) setShareUrl(r.shareUrl);
      if (success) setNotice(success);
      return true;
    } catch (e) {
      setError(e instanceof ApiClientError ? Object.values(e.fields)[0] ?? e.message : "Action failed");
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (error && !deal) return <Notice tone="error">{error}</Notice>;
  if (!deal || !me) return <Spinner />;

  const side = sideOf(deal, me.uid) ?? "creator";
  const podMember = Boolean(deal.pod && !sideOf(deal, me.uid));
  if (podMember) return <PodMemberView deal={deal} myUid={me.uid} onChange={(d) => setDeal(d as ClientDeal)} onStatus={(deliverableId, status, proofUrl) => act({ action: "deliverable_status", deliverableId, status, proofUrl }, deliverableId)} busy={busy} error={error} />;
  const other = side === "creator" ? deal.brandSide : deal.creatorSide;
  const otherKey = side === "creator" ? "brand" : "creator";
  const offPlatform = !other.uid;
  const isEditor = deal.createdBy === me.uid;
  const live = deal.status !== "cancelled";
  const today = todayIST();
  const due = balance(deal);
  const myName = me.member?.displayName ?? "";
  const upi = side === "creator" && billing?.upiId && due > 0 ? upiLink({ vpa: billing.upiId, name: billing.legalName || myName, amount: due, note: deal.title }) : null;
  const trackedUrl = deal.tracking.code ? `${site.url}/r/${deal.tracking.code}` : null;
  const r = roi(deal);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/dashboard/deals" className="text-sm text-muted hover:text-ink">{t("deal.back")}</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{deal.title}</h1>
          <p className="mt-1 text-muted">
            {t("deal.with")} <strong className="text-ink">{other.name}</strong>
            {` · ${t(offPlatform ? "deal.notOnPlatform" : "deal.onPlatform")}`} · {COMPENSATION_LABELS[deal.compensationType]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {deal.verifiedCompletion && <Badge tone="green">{t("desk.confirmedBoth")}</Badge>}
          <Badge tone={deal.status === "active" ? "blue" : deal.status === "completed" ? "green" : "slate"}>{statusLabel(locale, deal.status)}</Badge>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone="success">{notice}</Notice>}
      {deal.status === "cancelled" && <Notice tone="warn">Cancelled{deal.cancelReason ? `: ${deal.cancelReason}` : ""}.</Notice>}

      {/* Agreement */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t("deal.agreement")}</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <AgreeChip label={t("deal.you")} ok={Boolean(deal.acceptance[side])} />
            <AgreeChip label={other.name} ok={Boolean(deal.acceptance[otherKey])} via={deal.acceptance[otherKey]?.via} />
          </div>
        </div>
        <p className="text-sm text-muted">{t("deal.agreementWhy")}</p>
        <div className="flex flex-wrap gap-2">
          {live && !deal.acceptance[side] && <Button onClick={() => act({ action: "accept_terms" }, "accept", "✓")} loading={busy === "accept"}>{t("deal.iAgree")}</Button>}
          {live && offPlatform && (
            <Button variant="secondary" onClick={() => act({ action: "share_link" }, "share")} loading={busy === "share"}>
              {t(deal.hasShareLink ? "deal.newLinkFor" : "deal.sendForOk", { name: other.name.split(" ")[0]! })}
            </Button>
          )}
          {isEditor && deal.status === "active" && !editing && <Button variant="ghost" onClick={() => setEditing(true)}>{t("deal.editTerms")}</Button>}
        </div>
        {shareUrl && (
          <div className="space-y-2 rounded-xl bg-paper p-4 ring-1 ring-line">
            <p className="text-sm">{t("deal.privateLink", { name: other.name })}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} aria-label="Private agreement link" />
              <Button variant="secondary" onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy</Button>
              <a
                className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
                href={whatsappLink(other.phone, `Hi ${other.name}, here are the agreed details for "${deal.title}" — please review and tap OK:\n${shareUrl}\n— ${myName}`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("common.sendWhatsApp")}
              </a>
            </div>
          </div>
        )}
        {editing ? (
          <EditTerms
            deal={deal}
            busy={busy === "terms"}
            onCancel={() => setEditing(false)}
            onSave={async (t) => {
              if (await act({ action: "update_terms", terms: toTermsPayload(t) }, "terms", "Terms updated.")) setEditing(false);
            }}
          />
        ) : (
          <dl className="grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-2">
            <Textish label="Fee" value={deal.feeAmount > 0 ? formatInr(deal.feeAmount) : COMPENSATION_LABELS[deal.compensationType]} />
            <Textish label="Payment due" value={deal.paymentDueDate} />
            <Textish label="Payment terms" value={deal.paymentTerms} />
            <Textish label="Usage rights" value={deal.usageRights} />
            <Textish label="Revisions included" value={String(deal.revisionLimit)} />
          </dl>
        )}
      </Card>

      {deal.pod && <PodPanel deal={deal} myUid={me.uid} onChange={(d) => setDeal(d as ClientDeal)} />}

      {/* Deliverables */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t("deal.deliverables")}</h2>
          {side === "brand" && live && deal.deliverables.some((d) => d.status === "pending") && (
            <a className="text-sm font-medium text-brand hover:underline" href={whatsappLink(deal.creatorSide.phone, deliverableReminderText(deal, myName, locale))} target="_blank" rel="noopener noreferrer">
              {t("deal.nudge", { name: deal.creatorSide.name.split(" ")[0]! })}
            </a>
          )}
        </div>
        <ul className="divide-y divide-line">
          {deal.deliverables.map((d) => (
            <DeliverableRow
              key={d.id}
              d={d}
              today={today}
              disabled={!live || busy === d.id}
              onChange={(status, proofUrl) => act({ action: "deliverable_status", deliverableId: d.id, status, proofUrl }, d.id)}
            />
          ))}
        </ul>
      </Card>

      {/* Money */}
      {deal.compensationType !== "barter" && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{t("deal.payments")}</h2>
            {isPaymentOverdue(deal, today) && <Badge tone="red">{t("deal.overdueSince", { date: deal.paymentDueDate })}</Badge>}
          </div>
          <div>
            <div className="flex justify-between text-sm">
              <span>{t("deal.received", { amount: formatInr(received(deal)) })}</span>
              <span className="font-medium">{due > 0 ? t("deal.dueAmount", { amount: formatInr(due) }) : t("deal.fullyPaid")}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-teal" style={{ width: `${deal.feeAmount ? Math.min(100, (received(deal) / deal.feeAmount) * 100) : 0}%` }} />
            </div>
          </div>
          {deal.payments.length > 0 && (
            <ul className="divide-y divide-line text-sm">
              {deal.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {formatInr(p.amount)} · {p.method} · {p.date}
                    {p.note && <span className="text-muted"> · {p.note}</span>}
                  </span>
                  {p.recordedBy === me.uid && (
                    <button className="text-xs text-muted hover:text-red-600" onClick={() => act({ action: "remove_payment", paymentId: p.id }, `rm-${p.id}`)}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {live && due > 0 && <AddPayment busy={busy === "pay"} due={due} onAdd={(p) => act({ action: "add_payment", ...p }, "pay", "Payment recorded.")} />}
          {side === "creator" && live && offPlatform && (
            <div className="space-y-2 rounded-xl bg-paper p-4 ring-1 ring-line">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{t("deal.autoTitle")}</p>
                {deal.counterpartyWa?.optedIn ? <Badge tone="green">{t("deal.autoOptedIn", { name: other.name, number: deal.counterpartyWa.number })}</Badge> : <Badge>{t("deal.autoNotOptedIn")}</Badge>}
              </div>
              {deal.counterpartyWa?.optedIn ? (
                <>
                  <label className="flex items-center gap-3 text-sm">
                    <input type="checkbox" className="size-4" checked={Boolean(deal.autoReminders)} disabled={busy === "auto"} onChange={(e) => act({ action: "auto_reminders", enabled: e.target.checked }, "auto", e.target.checked ? "Auto-reminders on." : "Auto-reminders off.")} />
                    {t("deal.autoToggle", { name: other.name.split(" ")[0]! })}
                  </label>
                  {(deal.autoReminderCount ?? 0) > 0 && <p className="text-xs text-muted">{t("deal.autoSent", { n: deal.autoReminderCount ?? 0, date: deal.lastAutoReminderOn ?? "" })}</p>}
                </>
              ) : (
                <p className="text-xs text-muted">{t("deal.autoHint", { name: other.name.split(" ")[0]! })}</p>
              )}
            </div>
          )}
          {side === "creator" && live && due > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <a
                className="inline-flex items-center justify-center rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
                href={whatsappLink(deal.brandSide.phone, paymentReminderText(deal, { senderName: myName, upiId: billing?.upiId, locale }))}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("deal.sendReminder")}
              </a>
              {upi && (
                <Button variant="secondary" onClick={() => navigator.clipboard.writeText(upi)}>{t("deal.copyUpi")}</Button>
              )}
              <Link href={`/dashboard/deals/${deal.id}/invoice`} className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 ring-line hover:bg-slate-50">
                {deal.invoiceNumber ? t("deal.invoiceN", { n: deal.invoiceNumber }) : t("deal.createInvoice")}
              </Link>
              {!billing?.upiId && <p className="w-full text-xs text-muted"><Link href="/dashboard/billing" className="underline">{t("deal.upiTip")}</Link></p>}
            </div>
          )}
        </Card>
      )}

      {/* Results */}
      <Card className="space-y-4">
        <div>
          <h2 className="font-semibold">{t("deal.results")}</h2>
          <p className="mt-1 text-sm text-muted">{t("deal.resultsHint")}</p>
        </div>
        <TrackingForm
          deal={deal}
          disabled={!live}
          busy={busy === "track"}
          onSave={(destinationUrl, promoCode) => act({ action: "set_tracking", destinationUrl, promoCode }, "track", "Tracking saved.")}
        />
        {trackedUrl && deal.tracking.destinationUrl && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={trackedUrl} onFocus={(e) => e.currentTarget.select()} aria-label="Tracked link" />
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(trackedUrl)}>Copy tracked link</Button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label={t("deal.clicks")} value={deal.tracking.clicks.toLocaleString("en-IN")} />
          <div className="rounded-xl bg-paper p-4 ring-1 ring-line">
            <p className="text-xs text-muted">{t("deal.redemptions")}{deal.tracking.promoCode ? ` (${deal.tracking.promoCode})` : ""}</p>
            <div className="mt-1 flex items-center gap-2">
              <button className="grid size-9 place-items-center rounded-lg bg-white text-lg ring-1 ring-line disabled:opacity-40" aria-label="Remove one redemption" disabled={!live || busy === "red" || deal.tracking.redemptions === 0} onClick={() => act({ action: "redemption", delta: -1 }, "red")}>−</button>
              <span className="min-w-8 text-center text-2xl font-semibold tabular-nums">{deal.tracking.redemptions}</span>
              <button className="grid size-9 place-items-center rounded-lg bg-brand text-lg text-white disabled:opacity-40" aria-label="Add one redemption" disabled={!live || busy === "red"} onClick={() => act({ action: "redemption", delta: 1 }, "red")}>+</button>
            </div>
          </div>
          <Metric label={t("deal.cpc")} value={r.costPerClick ? formatInr(r.costPerClick) : "—"} />
          <Metric label={t("deal.cpCustomer")} value={r.costPerRedemption ? formatInr(r.costPerRedemption) : "—"} />
        </div>
      </Card>

      {/* Wrap up */}
      {live && (
        <Card className="space-y-3">
          <h2 className="font-semibold">{t("deal.wrapUp")}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <AgreeChip label={t("deal.you")} ok={Boolean(deal.completion[side])} okText={t("deal.confirmedDone")} />
            <AgreeChip label={other.name} ok={Boolean(deal.completion[otherKey])} okText={t("deal.confirmedDone")} via={deal.completion[otherKey]?.via} />
          </div>
          <p className="text-sm text-muted">
            When <strong>both</strong> sides confirm, the collaboration is added to the creator&apos;s Trust Passport as verified evidence. That track record only builds
            from deals logged here — it&apos;s what helps creators win better-paid work and helps brands pick reliable people.
          </p>
          <div className="flex flex-wrap gap-2">
            {!deal.completion[side] && <Button onClick={() => act({ action: "confirm_complete" }, "done", "✓")} loading={busy === "done"}>{t("deal.confirmComplete")}</Button>}
            {offPlatform && deal.completion[side] && !deal.completion[otherKey] && (
              <Button variant="secondary" onClick={() => act({ action: "share_link" }, "share")} loading={busy === "share"}>{t("deal.askConfirm", { name: other.name.split(" ")[0]! })}</Button>
            )}
            {deal.status === "active" && (
              <Button
                variant="ghost"
                onClick={() => {
                  const reason = window.prompt("Why are you cancelling? (visible to both sides)");
                  if (reason && reason.trim().length >= 3) void act({ action: "cancel", reason }, "cancel", "Deal cancelled.");
                }}
                disabled={busy === "cancel"}
              >
                {t("deal.cancel")}
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function AgreeChip({ label, ok, via, okText }: { label: string; ok: boolean; via?: "account" | "link"; okText?: string }) {
  const { t } = useLocale();
  okText = okText ?? t("deal.agreed");
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-3 py-1 ring-1", ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-white text-muted ring-line")}>
      <span className={cx("size-2 rounded-full", ok ? "bg-emerald-500" : "bg-slate-300")} aria-hidden />
      {label}: {ok ? `${okText}${via === "link" ? ` ${t("deal.viaLink")}` : ""}` : t("deal.pending")}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-paper p-4 ring-1 ring-line">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DeliverableRow({ d, today, disabled, onChange }: { d: Deal["deliverables"][number]; today: string; disabled: boolean; onChange: (status: string, proofUrl: string) => void }) {
  const [proof, setProof] = useState(d.proofUrl);
  const late = d.status !== "approved" && d.dueDate && d.dueDate < today;
  return (
    <li className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="font-medium">
          {d.qty}× {d.type} {late && <Badge tone="red">Overdue</Badge>}
        </p>
        <p className="text-sm text-muted">
          {d.dueDate ? `Due ${d.dueDate}` : "No due date"}
          {d.note && ` · ${d.note}`}
        </p>
        {d.proofUrl && (
          <a href={d.proofUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-brand hover:underline break-all">
            View posted content
          </a>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:w-72">
        <Input placeholder="Link to posted content (optional)" value={proof} onChange={(e) => setProof(e.target.value)} disabled={disabled} aria-label="Proof link" />
        <select
          aria-label="Status"
          value={d.status}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value, proof)}
          className="block w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line focus:ring-2 focus:ring-brand focus:outline-none"
        >
          <option value="pending">Pending</option>
          <option value="submitted">Posted / delivered</option>
          <option value="approved">Approved</option>
        </select>
      </div>
    </li>
  );
}

function AddPayment({ onAdd, busy, due }: { onAdd: (p: { amount: number; date: string; method: string; note: string }) => void; busy: boolean; due: number }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  if (!open) return <Button variant="secondary" onClick={() => setOpen(true)}>{t("deal.recordPayment")}</Button>;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onAdd({ amount: Math.floor(Number(fd.get("amount")) || 0), date: String(fd.get("date")), method: String(fd.get("method")), note: String(fd.get("note") ?? "") });
    setOpen(false);
  }
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl bg-paper p-4 ring-1 ring-line sm:grid-cols-4">
      <Field label="Amount (₹)" htmlFor="amount"><Input id="amount" name="amount" type="number" min={1} defaultValue={due} required /></Field>
      <Field label="Date" htmlFor="date"><Input id="date" name="date" type="date" defaultValue={todayIST()} required /></Field>
      <Field label="Method" htmlFor="method"><Select id="method" name="method" options={PAYMENT_METHODS} /></Field>
      <Field label="Note" htmlFor="note" optional><Input id="note" name="note" maxLength={200} placeholder="UTR / ref" /></Field>
      <div className="flex gap-2 sm:col-span-4">
        <Button type="submit" loading={busy}>Save payment</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}

function TrackingForm({ deal, onSave, busy, disabled }: { deal: Deal; onSave: (url: string, code: string) => void; busy: boolean; disabled: boolean }) {
  const [url, setUrl] = useState(deal.tracking.destinationUrl);
  const [code, setCode] = useState(deal.tracking.promoCode);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(url.trim(), code.trim().toUpperCase());
      }}
    >
      <Field label="Where should the link go?" htmlFor="dest" optional>
        <Input id="dest" type="url" placeholder="https://your-menu-or-store-page" value={url} onChange={(e) => setUrl(e.target.value)} disabled={disabled} />
      </Field>
      <Field label="Promo code" htmlFor="promo" optional>
        <Input id="promo" placeholder="RIYA10" maxLength={20} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={disabled} />
      </Field>
      <Button type="submit" variant="secondary" loading={busy} disabled={disabled}>Save</Button>
    </form>
  );
}

function EditTerms({ deal, onSave, onCancel, busy }: { deal: Deal; onSave: (t: TermsValue) => void; onCancel: () => void; busy: boolean }) {
  const [t, setT] = useState<TermsValue>(termsFromDeal(deal));
  return (
    <div className="space-y-4 border-t border-line pt-4">
      <TermsEditor value={t} onChange={setT} />
      <div className="flex gap-2">
        <Button onClick={() => onSave(t)} loading={busy}>Save terms</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function PodMemberView({ deal, myUid, onChange, onStatus, busy, error }: { deal: ClientDeal; myUid: string; onChange: (d: Deal) => void; onStatus: (id: string, status: string, proof: string) => void; busy: string | null; error: string | null }) {
  const today = todayIST();
  const mine = deal.deliverables.filter((d) => d.assigneeUid === myUid);
  const me = deal.pod!.members.find((m) => m.uid === myUid);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/dashboard/deals" className="text-sm text-muted hover:text-ink">← All deals</Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{deal.title}</h1>
        <p className="mt-1 text-muted">Pod deal with <strong className="text-ink">{deal.brandSide.name}</strong> · your role: {me?.role} · {me?.sharePct}% share</p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <Card className="space-y-3">
        <h2 className="font-semibold">Your deliverables</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted">Nothing assigned to you yet — your pod lead assigns work.</p>
        ) : (
          <ul className="divide-y divide-line">
            {mine.map((d) => (
              <DeliverableRow key={d.id} d={d} today={today} disabled={deal.status === "cancelled" || busy === d.id} onChange={(status, proofUrl) => onStatus(d.id, status, proofUrl)} />
            ))}
          </ul>
        )}
      </Card>
      <PodPanel deal={deal} myUid={myUid} onChange={onChange} />
    </div>
  );
}
