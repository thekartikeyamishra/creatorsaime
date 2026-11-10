"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NewDealForm } from "@/components/deal-forms";
import { useLocale } from "@/components/locale-provider";
import { Badge, Button, Card, Notice, Spinner, cx } from "@/components/ui";
import { api, ApiClientError, downloadAuthed } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth-context";
import { statusLabel } from "@/lib/i18n";
import { balance, formatInr, isPaymentOverdue, sideOf, summarize, todayIST, type Deal } from "@/lib/deals";

type ClientDeal = Deal & { verifiedCompletion: boolean };
const FILTERS = ["active", "completed", "cancelled", "all"] as const;

export default function DealsPage() {
  const { me } = useAuth();
  const { t, locale } = useLocale();
  const [items, setItems] = useState<ClientDeal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("active");

  const load = useCallback(async () => {
    try {
      const r = await api<{ items: ClientDeal[] }>("/api/deals");
      setItems(r.items);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not load deals");
      setItems([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const today = todayIST();
  const summary = useMemo(() => summarize(items ?? [], today), [items, today]);
  if (!me?.member) return <Notice tone="info">Accept your invite first.</Notice>;
  const iAmBrand = me.member.role === "brand";
  const visible = (items ?? []).filter((d) => filter === "all" || d.status === filter);

  async function create(body: unknown) {
    try {
      await api("/api/deals", { body });
      setCreating(false);
      await load();
    } catch (e) {
      if (e instanceof ApiClientError) return { fields: e.fields, message: e.message };
      return { message: "Could not save" };
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("desk.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("desk.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(items?.length ?? 0) > 0 && (
            <Button
              variant="secondary"
              onClick={() =>
                downloadAuthed("/api/deals/export", "creatorsai-deals.csv").catch(() =>
                  setError(iAmBrand ? "CSV export is part of the Growth plan — see Plan." : "Export failed. Try again."),
                )
              }
            >
              {t("desk.export")}
            </Button>
          )}
          {!creating && <Button onClick={() => setCreating(true)}>{t("desk.log")}</Button>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label={t(iAmBrand ? "desk.toPay" : "desk.toCollect")} value={formatInr(summary.outstanding)} tone={summary.outstanding > 0 ? "brand" : undefined} />
        <Tile label={t("desk.overdue")} value={`${formatInr(summary.overdueAmount)}`} sub={t("desk.dealsCount", { n: summary.overduePayments })} tone={summary.overduePayments > 0 ? "red" : undefined} />
        <Tile label={t("desk.dueWeek")} value={String(summary.dueThisWeek)} sub={summary.overdueDeliverables ? t("desk.overdueCount", { n: summary.overdueDeliverables }) : t("desk.noneOverdue")} tone={summary.overdueDeliverables ? "red" : undefined} />
        <Tile label={t(iAmBrand ? "desk.paid" : "desk.received")} value={formatInr(summary.received)} sub={t("desk.activeDone", { a: summary.activeDeals, d: summary.completedDeals })} />
      </div>
      {(summary.clicks > 0 || summary.redemptions > 0) && (
        <p className="text-sm text-muted">
          {t("desk.tracked", { c: summary.clicks.toLocaleString("en-IN"), r: summary.redemptions.toLocaleString("en-IN") })}
        </p>
      )}

      {creating && (
        <Card>
          <h2 className="mb-5 font-semibold">{t("form.logTitle")}</h2>
          <NewDealForm iAmBrand={iAmBrand} onCreate={create} onCancel={() => setCreating(false)} />
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cx("rounded-full px-3 py-1.5 text-sm capitalize ring-1", filter === f ? "bg-ink text-white ring-ink" : "bg-white ring-line")}>
            {t(`desk.filter.${f}`)}
          </button>
        ))}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {items === null ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <Card className="text-center">
          <p className="font-medium">{t("desk.empty")}</p>
          {items.length === 0 && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t("desk.emptyHint")}</p>}
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((d) => {
            const side = sideOf(d, me.uid) ?? "creator";
            const other = side === "creator" ? d.brandSide : d.creatorSide;
            const otherAccepted = Boolean(d.acceptance[side === "creator" ? "brand" : "creator"]);
            const next = d.deliverables.filter((x) => x.status !== "approved" && x.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
            const overdue = isPaymentOverdue(d, today);
            return (
              <li key={d.id}>
                <Link href={`/dashboard/deals/${d.id}`} className="block rounded-2xl bg-white p-5 ring-1 ring-line transition hover:ring-slate-300">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{d.title}</p>
                      <p className="text-sm text-muted">
                        {t("desk.with", { name: other.name })}
                        {!other.uid && ` · ${t("desk.offPlatform")}`}
                        {next && ` · ${t("desk.nextDue", { date: next.dueDate })}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {d.verifiedCompletion && <Badge tone="green">{t("desk.confirmedBoth")}</Badge>}
                      {!otherAccepted && d.status === "active" && <Badge tone="amber">{t("desk.awaitingOk")}</Badge>}
                      {overdue && <Badge tone="red">{t("desk.paymentOverdue")}</Badge>}
                      <Badge tone={d.status === "active" ? "blue" : d.status === "completed" ? "green" : "slate"}>{statusLabel(locale, d.status)}</Badge>
                    </div>
                  </div>
                  {d.feeAmount > 0 && (
                    <p className="mt-3 text-sm">
                      {formatInr(d.feeAmount)} · <span className={balance(d) > 0 ? "font-medium text-ink" : "text-muted"}>{balance(d) > 0 ? t("desk.due", { amount: formatInr(balance(d)) }) : t("desk.fullyPaid")}</span>
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "red" | "brand" }) {
  return (
    <Card className={cx(tone === "red" && "ring-red-200", tone === "brand" && "ring-blue-200")}>
      <p className="text-sm text-muted">{label}</p>
      <p className={cx("mt-1 text-2xl font-semibold tabular-nums", tone === "red" && "text-red-700")}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </Card>
  );
}
