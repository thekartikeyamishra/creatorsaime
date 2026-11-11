import Link from "next/link";
import { site } from "@/lib/config";
import { JsonLd } from "./json-ld";

export function Breadcrumbs({ items }: { items: Array<{ name: string; href: string }> }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((it, i) => (
            <li key={it.href} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {i < items.length - 1 ? <Link href={it.href} className="hover:text-white">{it.name}</Link> : <span aria-current="page" className="text-slate-300">{it.name}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${site.url}${it.href}` })),
        }}
      />
    </>
  );
}

export function ResourceHero({ crumbs, eyebrow, title, intro, meta }: { crumbs: Array<{ name: string; href: string }>; eyebrow: string; title: string; intro: string; meta?: React.ReactNode }) {
  return (
    <section className="grid-glow bg-ink text-white">
      <div className="container-page py-10 sm:py-14">
        <Breadcrumbs items={crumbs} />
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-teal">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-slate-300 sm:text-lg">{intro}</p>
        {meta && <div className="mt-5 text-sm text-slate-400">{meta}</div>}
      </div>
    </section>
  );
}

/** Loading skeleton shown while a tool's code chunk downloads. */
export function ToolSkeleton() {
  return (
    <div className="grid animate-pulse gap-6 lg:grid-cols-2" aria-busy="true" aria-label="Loading tool">
      <div className="h-80 rounded-2xl bg-white ring-1 ring-line" />
      <div className="h-80 rounded-2xl bg-white ring-1 ring-line" />
    </div>
  );
}
