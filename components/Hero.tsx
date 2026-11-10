import Link from "next/link";
import { prompts, categories } from "@/lib/prompts";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* atmospheric glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, #ff5436 0%, #d63b1f 35%, transparent 70%)",
        }}
      />
      <div className="grain pointer-events-none absolute inset-0 opacity-[0.07]" />

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 md:pt-28">
        <p className="animate-fade-in text-xs uppercase tracking-[0.3em] text-coral">
          {prompts.length} hand-tested prompts · {categories.length} categories
        </p>
        <h1 className="mt-5 max-w-3xl animate-fade-up font-display text-5xl leading-[1.05] text-bone md:text-7xl">
          The prompt is the{" "}
          <span className="italic text-coral">whole</span> craft.
        </h1>
        <p
          className="mt-6 max-w-xl animate-fade-up text-lg leading-relaxed text-bone-dim"
          style={{ animationDelay: "80ms" }}
        >
          A curated gallery of original AI image prompts — each one tested and
          routed to the generator that renders it best. Find a look, copy it,
          create.
        </p>
        <div
          className="mt-8 flex animate-fade-up flex-wrap gap-3"
          style={{ animationDelay: "160ms" }}
        >
          <Link
            href="/#explore"
            className="rounded-full bg-coral px-6 py-3 font-medium text-ink transition-colors hover:bg-coral-soft"
          >
            Explore prompts
          </Link>
          <Link
            href="/guides/"
            className="rounded-full border border-ink-600 px-6 py-3 font-medium text-bone transition-colors hover:border-bone-faint"
          >
            Read the guides
          </Link>
        </div>
      </div>
    </section>
  );
}
