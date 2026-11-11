import Link from "next/link";
import { AdSlot } from "@/components/ads";
import { JsonLd } from "@/components/json-ld";
import { ResourceHero } from "@/components/resources";
import { RecentTools } from "@/components/tools/recent";
import { site } from "@/lib/config";
import { TOOLS } from "@/lib/tools-catalog";
import { GUIDES } from "@/content/guides";

export const metadata = {
  title: "Free tools for creators and brands in India",
  description: "Free, private tools for Indian creators and local businesses: rate calculator, GST invoice generator, collaboration agreement, ASCI disclosure checker and engagement rate.",
  alternates: { canonical: "/tools" },
  openGraph: { url: "/tools", title: "Free tools for creators and brands in India" },
};

export default function ToolsHub() {
  return (
    <>
      <ResourceHero
        crumbs={[{ name: "Home", href: "/" }, { name: "Free tools", href: "/tools" }]}
        eyebrow="Free tools · no sign-up"
        title="Tools that get creators paid fairly — and brands real results"
        intro="Built for the way India actually works: rupees, GST, UPI, WhatsApp and ASCI rules. Everything runs in your browser; nothing you type is uploaded."
      />
      <section className="container-page py-12 sm:py-16">
        <RecentTools />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((t) => (
            <li key={t.slug} data-reveal>
              <Link href={`/tools/${t.slug}`} data-tilt data-spotlight className="flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-line hover:ring-slate-300">
                <span aria-hidden className="grid size-11 place-items-center rounded-xl bg-ink text-lg font-semibold text-white">{t.emoji}</span>
                <h2 className="mt-4 text-lg font-semibold tracking-tight">{t.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted">{t.blurb}</p>
                <span className="mt-4 text-sm font-medium text-brand">Open tool →</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-16" data-reveal>
          <h2 className="text-2xl font-semibold tracking-tight">Guides to go with them</h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="block rounded-xl bg-white px-5 py-4 ring-1 ring-line hover:ring-slate-300">
                  <span className="font-medium">{g.title}</span>
                  <span className="mt-1 block text-sm text-muted">{g.audience} · {g.minutes} min read</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <AdSlot placement="multiplex" />
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Free tools for creators and brands",
          itemListElement: TOOLS.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: `${site.url}/tools/${t.slug}`, name: t.name })),
        }}
      />
    </>
  );
}
