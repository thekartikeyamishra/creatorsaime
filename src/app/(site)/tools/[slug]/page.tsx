import dynamic from "next/dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSlot } from "@/components/ads";
import { JsonLd } from "@/components/json-ld";
import { ResourceHero, ToolSkeleton } from "@/components/resources";
import { site } from "@/lib/config";
import { TOOLS, toolBySlug } from "@/lib/tools-catalog";
import { TOOL_CONTENT } from "@/content/tool-content";
import { guideBySlug } from "@/content/guides";

// Each tool is its own code chunk, server-rendered for SEO and hydrated with a skeleton fallback.
const TOOL_UI: Record<string, React.ComponentType> = {
  "rate-calculator": dynamic(() => import("@/components/tools/rate-calculator").then((m) => m.RateCalculator), { loading: () => <ToolSkeleton /> }),
  "gst-invoice-generator": dynamic(() => import("@/components/tools/invoice-generator").then((m) => m.InvoiceGenerator), { loading: () => <ToolSkeleton /> }),
  "collab-agreement-generator": dynamic(() => import("@/components/tools/agreement-generator").then((m) => m.AgreementGenerator), { loading: () => <ToolSkeleton /> }),
  "ad-disclosure-checker": dynamic(() => import("@/components/tools/disclosure-checker").then((m) => m.DisclosureChecker), { loading: () => <ToolSkeleton /> }),
  "engagement-rate-calculator": dynamic(() => import("@/components/tools/engagement-calculator").then((m) => m.EngagementCalculator), { loading: () => <ToolSkeleton /> }),
};

export const dynamicParams = false;
export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = toolBySlug(slug);
  if (!t) return {};
  return {
    title: t.name,
    description: t.description,
    alternates: { canonical: `/tools/${t.slug}` },
    openGraph: { type: "website", url: `/tools/${t.slug}`, title: t.name, description: t.description },
    twitter: { title: t.name, description: t.description },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = toolBySlug(slug);
  const c = TOOL_CONTENT[slug];
  const UI = TOOL_UI[slug];
  if (!t || !c || !UI) notFound();
  const [first, ...rest] = c.sections;
  const related = TOOLS.filter((x) => x.slug !== slug).slice(0, 3);

  return (
    <>
      <ResourceHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Free tools", href: "/tools" }, { name: t.name, href: `/tools/${t.slug}` }]}
        eyebrow="Free tool · private · no sign-up"
        title={c.h1}
        intro={c.intro}
      />
      <section className="container-page py-10 sm:py-14">
        <UI />
      </section>

      <section className="border-t border-line bg-white">
        <div className="container-page grid gap-12 py-14 lg:grid-cols-[1fr_18rem]">
          <article className="prose-guide">
            {first && (
              <>
                <h2>{first.h2}</h2>
                {first.body}
              </>
            )}
            <AdSlot placement="tool" />
            {rest.map((s) => (
              <div key={s.h2}>
                <h2>{s.h2}</h2>
                {s.body}
              </div>
            ))}
            <h2>Frequently asked questions</h2>
            {c.faq.map((f) => (
              <div key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p className="text-sm text-muted">
              Last reviewed {t.updated} by {site.founder}. General information, not legal, tax or financial advice.
            </p>
          </article>
          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start" aria-label="Related">
            <div>
              <p className="text-sm font-semibold">Read next</p>
              <ul className="mt-3 space-y-2 text-sm">
                {c.guides.map((gs) => {
                  const g = guideBySlug(gs);
                  return g ? <li key={gs}><Link href={`/guides/${g.slug}`} className="text-brand hover:underline">{g.title}</Link></li> : null;
                })}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold">More free tools</p>
              <ul className="mt-3 space-y-2 text-sm">
                {related.map((r) => <li key={r.slug}><Link href={`/tools/${r.slug}`} className="text-brand hover:underline">{r.name}</Link></li>)}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: t.name,
            url: `${site.url}/tools/${t.slug}`,
            description: t.description,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Any (web browser)",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
            publisher: { "@type": "Organization", name: site.name, url: site.url },
            dateModified: t.updated,
            inLanguage: "en-IN",
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />
    </>
  );
}
