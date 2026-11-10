import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { guides } from "@/lib/guides";

/**
 * Surfaces the latest guides on the home page so the highest-authority page
 * links into the articles (internal link equity) and visitors discover them.
 */
export default function GuidesPreview({ limit = 4 }: { limit?: number }) {
  const latest = [...guides]
    .sort((a, b) => b.published.localeCompare(a.published))
    .slice(0, limit);

  if (latest.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-6">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl text-bone">From the guides</h2>
          <p className="mt-2 text-bone-dim">
            Deep dives on prompting and picking the right generator.
          </p>
        </div>
        <Link
          href="/guides/"
          className="hidden shrink-0 items-center gap-1 text-sm text-coral hover:underline sm:inline-flex"
        >
          All guides <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {latest.map((g) => (
          <Link
            key={g.slug}
            href={`/guides/${g.slug}/`}
            className="animate-in group flex flex-col rounded-2xl border border-ink-700 bg-ink-800/60 p-6 transition-all duration-300 hover:border-coral/40 hover:shadow-[0_8px_40px_-12px_rgba(255,84,54,0.2)]"
          >
            <span className="text-[11px] uppercase tracking-[0.2em] text-bone-faint">
              {g.region} · {g.readMins} min read
            </span>
            <h3 className="mt-1 font-display text-xl leading-snug text-bone group-hover:text-coral">
              {g.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-bone-dim">{g.dek}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm text-coral">
              Read guide
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </div>

      <Link
        href="/guides/"
        className="mt-6 inline-flex items-center gap-1 text-sm text-coral hover:underline sm:hidden"
      >
        All guides <ArrowRight size={14} />
      </Link>
    </section>
  );
}
