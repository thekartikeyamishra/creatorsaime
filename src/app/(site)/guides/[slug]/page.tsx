import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Fragment } from "react";
import { AdSlot } from "@/components/ads";
import { JsonLd } from "@/components/json-ld";
import { ResourceHero } from "@/components/resources";
import { site } from "@/lib/config";
import { GUIDES, guideBySlug } from "@/content/guides";
import { toolBySlug } from "@/lib/tools-catalog";

export const dynamicParams = false;
export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    authors: [{ name: site.founder, url: `${site.url}/about` }],
    openGraph: { type: "article", url: `/guides/${g.slug}`, title: g.title, description: g.description, publishedTime: g.published, modifiedTime: g.updated, authors: [site.founder] },
    twitter: { title: g.title, description: g.description },
  };
}

const fmt = (d: string) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) notFound();
  const others = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 3);

  return (
    <>
      <ResourceHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Guides", href: "/guides" }, { name: g.title, href: `/guides/${g.slug}` }]}
        eyebrow={`${g.audience} · ${g.minutes} min read`}
        title={g.title}
        intro={g.description}
        meta={<>By <Link href="/about" className="text-slate-200 hover:text-white">{site.founder}</Link> · Updated <time dateTime={g.updated}>{fmt(g.updated)}</time></>}
      />
      <div className="bg-white">
        <div className="container-page grid gap-12 py-12 lg:grid-cols-[1fr_17rem]">
          <article className="prose-guide">
            <div className="not-prose rounded-2xl bg-paper p-5 ring-1 ring-line">
              <p className="text-sm font-semibold">Key takeaways</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-6">
                {g.takeaways.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
            {g.sections.map((s, i) => (
              <Fragment key={s.id}>
                <h2 id={s.id}>{s.h2}</h2>
                {s.body}
                {i === 1 && g.sections.length >= 4 && <AdSlot placement="article" />}
              </Fragment>
            ))}
            <h2 id="sources">Sources</h2>
            <ul>
              {g.sources.map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
              ))}
            </ul>
            <p className="text-sm text-muted">
              General information to help you plan, not legal, tax or financial advice. Rules change — confirm specifics with a qualified professional. Spotted something out of date?{" "}
              <Link href="/contact">Tell us</Link> and we will fix it.
            </p>
          </article>
          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start" aria-label="On this page">
            <nav aria-label="Contents">
              <p className="text-sm font-semibold">On this page</p>
              <ol className="mt-3 space-y-2 text-sm text-muted">
                {g.sections.map((s) => <li key={s.id}><a href={`#${s.id}`} className="hover:text-ink">{s.h2}</a></li>)}
              </ol>
            </nav>
            <div className="rounded-2xl bg-ink p-5 text-white" data-spotlight>
              <p className="text-sm font-semibold">Try it now</p>
              <ul className="mt-3 space-y-2 text-sm">
                {g.tools.map((ts) => {
                  const t = toolBySlug(ts);
                  return t ? <li key={ts}><Link href={`/tools/${t.slug}`} className="text-teal hover:underline">{t.name} →</Link></li> : null;
                })}
              </ul>
            </div>
          </aside>
        </div>
        <section className="border-t border-line">
          <div className="container-page py-12">
            <h2 className="text-xl font-semibold tracking-tight">Keep reading</h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-3">
              {others.map((o) => (
                <li key={o.slug} data-reveal>
                  <Link href={`/guides/${o.slug}`} data-tilt className="block h-full rounded-2xl bg-paper p-5 ring-1 ring-line hover:ring-slate-300">
                    <span className="font-medium">{o.title}</span>
                    <span className="mt-2 block text-sm text-muted">{o.minutes} min read</span>
                  </Link>
                </li>
              ))}
            </ul>
            <AdSlot placement="multiplex" />
          </div>
        </section>
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.description,
          datePublished: g.published,
          dateModified: g.updated,
          inLanguage: "en-IN",
          mainEntityOfPage: `${site.url}/guides/${g.slug}`,
          image: `${site.url}/opengraph-image`,
          author: { "@type": "Person", name: site.founder, url: `${site.url}/about`, sameAs: [site.xUrl] },
          publisher: { "@type": "Organization", name: site.name, url: site.url, logo: { "@type": "ImageObject", url: `${site.url}/icon.svg` } },
        }}
      />
    </>
  );
}
