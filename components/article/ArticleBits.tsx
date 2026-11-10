import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import CopyButton from "@/components/CopyButton";
import JsonLd from "@/components/JsonLd";
import { faqSchema } from "@/lib/seo";
import { getPrompt } from "@/lib/prompts";

export function KeyTakeaways({ points }: { points: string[] }) {
  return (
    <aside className="not-prose my-8 rounded-2xl border border-coral/30 bg-coral/5 p-6">
      <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-coral">
        <Sparkles size={16} aria-hidden /> Key takeaways
      </p>
      <ul className="mt-3 space-y-2 text-bone-dim">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1 text-coral" aria-hidden>
              →
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Inlines a real gallery prompt inside an article: copy button + link to its page. */
export function PromptCallout({ id }: { id: string }) {
  const p = getPrompt(id);
  if (!p) return null;
  return (
    <div className="not-prose my-6 rounded-2xl border border-ink-700 bg-ink-800/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-bone-faint">
            Best in {p.bestTool} · {p.aspectRatio}
          </span>
          <h4 className="font-display text-lg text-bone">
            <Link href={`/prompt/${p.id}/`} className="hover:text-coral">
              {p.title}
            </Link>
          </h4>
        </div>
        <CopyButton text={p.prompt} />
      </div>
      <p className="mt-3 font-mono text-xs leading-relaxed text-bone-dim">
        {p.prompt}
      </p>
    </div>
  );
}

export function ArticleFAQ({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section className="not-prose mt-14">
      <JsonLd data={faqSchema(items)} />
      <h2 className="font-display text-3xl text-bone">Frequently asked</h2>
      <dl className="mt-6 space-y-4">
        {items.map((f) => (
          <div key={f.q} className="rounded-xl border border-ink-700 p-5">
            <dt className="font-medium text-bone">{f.q}</dt>
            <dd className="mt-2 leading-relaxed text-bone-dim">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function GalleryCTA({
  href = "/category/product-mockups/",
  label = "Browse all product & mockup prompts",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <div className="not-prose mt-12">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-full bg-coral px-6 py-3 font-medium text-ink transition-colors hover:bg-coral-soft"
      >
        {label} <ArrowRight size={16} aria-hidden />
      </Link>
    </div>
  );
}
