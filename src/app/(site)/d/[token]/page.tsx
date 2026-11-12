import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DealLinkActions } from "@/components/deal-link-actions";
import { ReviewPanel } from "@/components/review-panel";
import { adminDb } from "@/lib/firebase/admin";
import { C } from "@/lib/server/collections";
import { Badge, Card } from "@/components/ui";
import { COMPENSATION_LABELS } from "@/lib/config";
import { balance, formatInr, received } from "@/lib/deals";
import { resolveDealLink } from "@/lib/server/deal-links";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, pickLocale, statusLabel, translate, type MessageKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";
// Private link: never indexed, never leak the token via Referer.
export const metadata: Metadata = { title: "Collaboration details", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function DealLinkPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  const { lang } = await searchParams;
  const locale = pickLocale({ query: lang, cookie: (await cookies()).get(LOCALE_COOKIE)?.value, acceptLanguage: (await headers()).get("accept-language") });
  const t = (k: MessageKey, v?: Record<string, string | number>) => translate(locale, k, v);
  const r = await resolveDealLink(token);
  if (!r) notFound();
  const { deal, side } = r;
  const me = side === "creator" ? deal.creatorSide : deal.brandSide;
  const them = side === "creator" ? deal.brandSide : deal.creatorSide;
  const accepted = deal.acceptance[side];
  const completed = deal.completion[side];
  // The member who shared this link gets credit if the client joins (their referral link, if they have one).
  const sharerUid = them.uid;
  const sharerCode = sharerUid ? await adminDb().collection(C.users).doc(sharerUid).get().then((u) => (u.get("refCode") as string | undefined) ?? null).catch(() => null) : null;
  const joinHref = sharerCode ? `/r/${sharerCode}` : `/signup?role=${side === "brand" ? "brand" : "creator"}`;

  return (
    <section className="container-page max-w-3xl py-12 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">{t("link.sharedBy", { name: them.name })}</p>
        <div className="flex gap-1 text-xs font-semibold">
          <a href="?lang=en" className={locale === "en" ? "rounded-lg bg-ink px-2 py-1 text-white" : "rounded-lg px-2 py-1 text-muted"}>EN</a>
          <a href="?lang=hi" className={locale === "hi" ? "rounded-lg bg-ink px-2 py-1 text-white" : "rounded-lg px-2 py-1 text-muted"}>हिंदी</a>
        </div>
      </div>
      <Card className="mt-3 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{deal.title}</h1>
            <p className="mt-1 text-muted">{deal.creatorSide.name} × {deal.brandSide.name}</p>
          </div>
          <Badge tone={deal.status === "cancelled" ? "slate" : deal.status === "completed" ? "green" : "blue"}>{statusLabel(locale, deal.status)}</Badge>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{t("link.deliverables")}</h2>
          <ul className="mt-2 space-y-2">
            {deal.deliverables.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-paper px-4 py-3 ring-1 ring-line">
                <span>
                  {d.qty}× {d.type}
                  {d.dueDate && <span className="text-muted"> · {t("link.due", { date: d.dueDate })}</span>}
                  {d.note && <span className="text-muted"> · {d.note}</span>}
                </span>
                <span className="flex items-center gap-2">
                  {d.proofUrl && <a href={d.proofUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-brand hover:underline">{t("link.view")}</a>}
                  <Badge tone={d.status === "approved" ? "green" : d.status === "submitted" ? "blue" : "slate"}>{d.status === "submitted" ? t("link.delivered") : d.status === "approved" ? "✓" : t("deal.pending")}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">{t("link.compensation")}</dt><dd className="font-medium">{deal.feeAmount > 0 ? formatInr(deal.feeAmount) : COMPENSATION_LABELS[deal.compensationType]}</dd></div>
          {deal.feeAmount > 0 && <div><dt className="text-muted">{t("link.paidBalance")}</dt><dd className="font-medium">{t("link.paidDue", { paid: formatInr(received(deal)), due: formatInr(balance(deal)) })}</dd></div>}
          {deal.paymentDueDate && <div><dt className="text-muted">{t("link.paymentDue")}</dt><dd>{deal.paymentDueDate}</dd></div>}
          {deal.paymentTerms && <div><dt className="text-muted">{t("link.paymentTerms")}</dt><dd>{deal.paymentTerms}</dd></div>}
          {deal.usageRights && <div><dt className="text-muted">{t("link.usage")}</dt><dd>{deal.usageRights}</dd></div>}
          <div><dt className="text-muted">{t("link.revisions")}</dt><dd>{deal.revisionLimit}</dd></div>
        </dl>

        {deal.status !== "cancelled" && (
          <DealLinkActions
            token={token}
            defaultName={me.name}
            accepted={accepted ? `${accepted.by} on ${new Date(accepted.at).toLocaleDateString("en-IN")}` : null}
            completed={completed ? `${completed.by} on ${new Date(completed.at).toLocaleDateString("en-IN")}` : null}
            otherConfirmedDone={Boolean(deal.completion[side === "creator" ? "brand" : "creator"])}
            waOptedIn={Boolean(deal.counterpartyWa)}
            otherName={them.name}
            locale={locale}
          />
        )}
      </Card>
      {deal.verifiedCompletion && !me.uid && (
        <div className="mt-6">
          <ReviewPanel endpoint={`/api/d/${token}/review`} auth={false} askName={!me.name} defaultName={me.name} />
        </div>
      )}
      <div className="mt-8 rounded-2xl bg-ink p-6 text-white">
        <p className="font-semibold">{t("link.ctaTitle")}</p>
        <p className="mt-1 text-sm text-slate-300">{t("link.ctaBody")}</p>
        <a href={joinHref} className="mt-4 inline-block rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-ink">{t("link.ctaBtn")}</a>
        {side === "brand" && sharerCode && <p className="mt-3 text-xs text-slate-400">Joining through {them.name}&apos;s invite gives your business 14 days of Growth free.</p>}
      </div>
    </section>
  );
}
