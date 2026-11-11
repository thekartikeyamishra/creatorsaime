import Link from "next/link";
import { AdSlot } from "@/components/ads";
import { JsonLd } from "@/components/json-ld";
import { ResourceHero } from "@/components/resources";
import { site } from "@/lib/config";
import { GUIDES } from "@/content/guides";

export const metadata = {
  title: "Guides for Indian creators and local brands",
  description: "Practical, sourced guides on pricing, GST and TDS, collaboration agreements, getting paid on time, ASCI ad disclosure and measuring creator ROI.",
  alternates: { canonical: "/guides" },
  openGraph: { url: "/guides", title: "Guides for Indian creators and local brands" },
};

export default function GuidesHub() {
  return (
    <>
      <ResourceHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Guides", href: "/guides" }]}
        eyebrow="Guides"
        title="Straight answers for creators and the businesses that hire them"
        intro="Written for India, kept up to date, with sources you can check. Every guide links to a free tool so you can act on it straight away."
      />
      <section className="container-page py-12 sm:py-16">
        <ul className="grid gap-5 md:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug} data-reveal>
              <Link href={`/guides/${g.slug}`} data-spotlight className="flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-line hover:ring-slate-300">
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-600">{g.audience}</span>
                <h2 className="mt-2 text-lg font-semibold tracking-tight">{g.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted">{g.description}</p>
                <span className="mt-4 text-sm text-muted">{g.minutes} min read · updated {g.updated}</span>
              </Link>
            </li>
          ))}
        </ul>
        <AdSlot placement="multiplex" />
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: GUIDES.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: `${site.url}/guides/${g.slug}`, name: g.title })),
        }}
      />
    </>
  );
}
