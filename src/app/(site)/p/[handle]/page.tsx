import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { SOCIAL_PLATFORM_LABELS, site, type SocialPlatform } from "@/lib/config";
import { getPublicPassport } from "@/lib/server/passport";
import { Stars } from "@/components/review-panel";
import { summarize, type PublicReview } from "@/lib/reviews";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const p = await getPublicPassport(handle);
  if (!p) return { title: "Profile not found", robots: { index: false } };
  const verified = p.verifiedPlatforms.length > 0 || p.verifiedBusiness;
  const what = p.role === "brand" ? p.industry : p.categories.join(", ");
  return {
    title: `${p.displayName} — ${p.role === "brand" ? "Brand" : "Creator"} in ${p.city}`,
    description: `${p.displayName}${what ? ` · ${what}` : ""} · ${p.city}. ${p.role === "brand" ? "Brand profile" : "Creator Trust Passport"} on ${site.name}.`,
    alternates: { canonical: `/p/${p.handle}` },
    // Only index profiles with at least one verified signal (avoids thin pages).
    robots: { index: verified, follow: verified },
    openGraph: { type: "profile", title: `${p.displayName} on ${site.name}`, url: `/p/${p.handle}` },
  };
}

function ReviewsPanel({ reviews }: { reviews: PublicReview[] }) {
  if (!reviews.length) return null;
  const s = summarize(reviews);
  return (
    <section aria-labelledby="reviews" className="space-y-3">
      <h2 id="reviews" className="text-sm font-semibold uppercase tracking-wider text-muted">Verified reviews</h2>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-semibold tabular-nums">{s.average?.toFixed(1)}</span>
        <div>
          <Stars value={s.average ?? 0} />
          <p className="text-xs text-muted">{s.count} review{s.count === 1 ? "" : "s"} · each from a deal both sides confirmed</p>
        </div>
      </div>
      {s.topTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {s.topTags.map((t) => <span key={t.tag} className="rounded-full bg-paper px-2.5 py-1 text-xs ring-1 ring-line">{t.tag} · {t.count}</span>)}
        </div>
      )}
      <ul className="space-y-2">
        {reviews.slice(0, 6).map((r) => (
          <li key={r.id} className="rounded-xl bg-paper px-4 py-3 ring-1 ring-line">
            <div className="flex items-center justify-between gap-2">
              <Stars value={r.rating} size="text-sm" />
              <span className="text-xs text-muted">{r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : ""}</span>
            </div>
            {r.text && <p className="mt-1.5 text-sm leading-6">“{r.text}”</p>}
            <p className="mt-1.5 text-xs text-muted">— {r.reviewerName}{r.via === "link" ? " · client via private deal link" : " · verified member"} · {r.dealTitle}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReliabilityPanel({ p }: { p: Awaited<ReturnType<typeof getPublicPassport>> & object }) {
  const r = p.reliability;
  const rows: string[] = [];
  if (r && p.role !== "brand" && r.asCreator.verifiedDeals > 0) {
    rows.push(`${r.asCreator.verifiedDeals} collaboration${r.asCreator.verifiedDeals > 1 ? "s" : ""} confirmed by both sides`);
    if (r.asCreator.deliverablesWithDueDate > 0) rows.push(`Delivered on time: ${r.asCreator.deliveredOnTime} of ${r.asCreator.deliverablesWithDueDate} deliverables`);
    if (r.asCreator.repeatClients > 0) rows.push(`${r.asCreator.repeatClients} client${r.asCreator.repeatClients > 1 ? "s" : ""} came back for more`);
  }
  if (r && p.role === "brand" && r.asBrand.verifiedDeals > 0) {
    rows.push(`${r.asBrand.verifiedDeals} collaboration${r.asBrand.verifiedDeals > 1 ? "s" : ""} confirmed by both sides`);
    if (r.asBrand.paymentsWithDueDate > 0) rows.push(`Paid creators on time: ${r.asBrand.paidOnTime} of ${r.asBrand.paymentsWithDueDate}`);
    if (r.asBrand.repeatCreators > 0) rows.push(`Rehired ${r.asBrand.repeatCreators} creator${r.asBrand.repeatCreators > 1 ? "s" : ""}`);
  }
  return (
    <div className="rounded-xl bg-paper p-4 ring-1 ring-line">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Track record</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No two-sided confirmed collaborations yet.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">{rows.map((x) => <li key={x}>✓ {x}</li>)}</ul>
      )}
      <p className="mt-2 text-xs text-muted">Counted only from deals both parties confirmed on CreatorsAI. Updated daily.</p>
    </div>
  );
}

function signalLabel(s: { type: string; detail: Record<string, string> }): string {
  switch (s.type) {
    case "business_verified":
      return "Business identity verified";
    case "collaboration_completed_verified":
      return `Completed collaboration${s.detail.counterparty ? ` with ${s.detail.counterparty}` : ""} — confirmed by both parties`;
    case "pod_collaboration_completed":
      return `Pod collaboration${s.detail.counterparty ? ` with ${s.detail.counterparty}` : ""} — confirmed by both parties`;
    case "collaboration_confirmed_by_client":
      return `Completed collaboration${s.detail.counterparty ? ` with ${s.detail.counterparty}` : ""} — confirmed by client`;
    default:
      return `${SOCIAL_PLATFORM_LABELS[s.detail.platform as SocialPlatform] ?? "Account"} ownership verified`;
  }
}

export default async function PassportPage({ params }: Props) {
  const { handle } = await params;
  const p = await getPublicPassport(handle);
  if (!p) notFound();

  const isBrand = p.role === "brand";
  const collabs = p.signals.filter((s) => s.type.startsWith("collaboration_") || s.type === "pod_collaboration_completed").length;
  return (
    <section className="container-page max-w-4xl py-12 sm:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          url: `${site.url}/p/${p.handle}`,
          mainEntity: {
            "@type": isBrand ? "Organization" : "Person",
            name: p.displayName,
            ...(p.city ? { address: { "@type": "PostalAddress", addressLocality: p.city, addressCountry: "IN" } } : {}),
            ...(p.bio ? { description: p.bio } : {}),
            sameAs: [...p.signals.map((s) => s.detail.url).filter(Boolean), ...(p.website ? [p.website] : [])],
          },
        }}
      />
      <Card className="!p-0 overflow-hidden">
        <div className="grid-glow bg-ink px-6 py-10 text-white sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal">{isBrand ? "Brand profile" : "Creator Trust Passport"}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-brand to-teal text-2xl font-semibold">
              {p.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{p.displayName}</h1>
              <p className="text-slate-300">
                {isBrand ? p.industry : p.categories.join(" · ")} {p.city && `· ${p.city}`}
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {p.verifiedBusiness && <Badge tone="green">Verified business</Badge>}
            {p.verifiedPlatforms.map((pl) => (
              <Badge key={pl} tone="green">{SOCIAL_PLATFORM_LABELS[pl as SocialPlatform] ?? pl} verified</Badge>
            ))}
            {collabs > 0 && <Badge tone="blue">{collabs} confirmed collaboration{collabs === 1 ? "" : "s"}</Badge>}
            {!isBrand && p.openToPods && <Badge tone="teal">Open to Creator Pods</Badge>}
            {p.ambassador && <Badge tone="amber">★ {p.ambassador}</Badge>}
          </div>
        </div>

        <div className="grid gap-8 px-6 py-8 sm:px-10 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            {p.bio && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">About</h2>
                <p className="mt-2 whitespace-pre-line">{p.bio}</p>
              </div>
            )}
            {p.portfolioLinks.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Portfolio</h2>
                <ul className="mt-2 space-y-1">
                  {p.portfolioLinks.map((l) => (
                    <li key={l}>
                      <a href={l} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all text-brand hover:underline">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {p.website && (
              <a href={p.website} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all text-brand hover:underline">{p.website}</a>
            )}
            {p.rateCardNote && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Rates</h2>
                <p className="mt-2">{p.rateCardNote}</p>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <ReliabilityPanel p={p} />
            <ReviewsPanel reviews={p.reviews} />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Verified evidence</h2>
            {p.signals.length === 0 ? (
              <p className="text-sm text-muted">No verified evidence yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {p.signals.map((s, i) => (
                  <li key={i} className="rounded-xl bg-paper px-4 py-3 ring-1 ring-line">
                    <p className="font-medium">
                      {signalLabel(s)}
                    </p>
                    {s.at && <p className="text-xs text-muted">Reviewed {new Date(s.at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>}
                  </li>
                ))}
              </ul>
            )}
            {p.languages.length > 0 && <p className="text-sm"><span className="text-muted">Languages:</span> {p.languages.join(", ")}</p>}
            {p.memberSince && <p className="text-sm text-muted">Member since {new Date(p.memberSince).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>}
            <p className="text-xs text-muted">
              Badges mean a person reviewed specific evidence. They are not an endorsement or performance guarantee. <Link href="/terms" className="underline">Learn more</Link>
            </p>
          </div>
        </div>
      </Card>
      <div className="mt-8 text-center">
        <ButtonLink href="/join" variant="secondary">Get your own Trust Passport</ButtonLink>
      </div>
    </section>
  );
}
