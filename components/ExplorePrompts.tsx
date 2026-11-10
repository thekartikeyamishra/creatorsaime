"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import PromptCard from "./PromptCard";
import type { Category, Prompt } from "@/lib/prompts";

/**
 * Client-side gallery browser.
 *
 * Design decisions worth keeping:
 *  - CSS grid, not `columns`. The old masonry used CSS multi-column, which
 *    reorders content top-to-bottom-per-column (bad reading order for screen
 *    readers and keyboard users) and breaks any element that can't be split
 *    across a column boundary.
 *  - No ad units inside this list. Ads used to be injected every 8 cards, but
 *    this list re-renders on every keystroke and every filter change, so those
 *    <ins> elements mounted and unmounted constantly. Rapidly recreating ad
 *    slots looks like artificial impression inflation and is a real AdSense
 *    policy risk. Ads live in stable positions outside the filtered list.
 *  - useDeferredValue keeps typing responsive without a manual debounce.
 */
export default function ExplorePrompts({
  prompts,
  categories,
}: {
  prompts: Prompt[];
  categories: Category[];
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("all");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return prompts.filter((p) => {
      if (active !== "all" && p.category !== active) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q) ||
        p.bestTool.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [prompts, deferredQuery, active]);

  const activeName =
    active === "all"
      ? "all categories"
      : categories.find((c) => c.slug === active)?.name ?? active;

  return (
    <section id="explore" className="mx-auto max-w-6xl scroll-mt-20 px-5">
      <div className="relative mb-6">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bone-faint"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search prompts, styles, or tools"
          aria-controls="prompt-results"
          placeholder="Search prompts, styles, or tools…"
          className="w-full rounded-xl border border-ink-700 bg-ink-800/60 py-3 pl-11 pr-11 text-bone placeholder:text-bone-faint focus:border-coral/50 focus:outline-none focus:ring-1 focus:ring-coral/30"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-bone-faint transition-colors hover:bg-ink-700 hover:text-bone"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </div>

      <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <Chip label="All" on={active === "all"} onClick={() => setActive("all")} />
        {categories.map((c) => (
          <Chip
            key={c.slug}
            label={c.name}
            on={active === c.slug}
            onClick={() => setActive(c.slug)}
          />
        ))}
      </div>

      {/* Announce result counts to screen readers without visually duplicating them. */}
      <p aria-live="polite" className="sr-only">
        {filtered.length} {filtered.length === 1 ? "prompt" : "prompts"} in {activeName}
        {deferredQuery.trim() ? ` matching ${deferredQuery.trim()}` : ""}.
      </p>

      <div id="prompt-results">
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-bone-dim">
              No prompts match{" "}
              <span className="text-bone">&ldquo;{deferredQuery.trim()}&rdquo;</span>
              {active !== "all" ? ` in ${activeName}` : ""}.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActive("all");
              }}
              className="mt-4 rounded-full border border-ink-600 px-5 py-2 text-sm text-bone-dim transition-colors hover:border-coral/50 hover:text-bone"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p, i) => (
              <PromptCard key={p.id} prompt={p} priority={i < 3} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Chip({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
        on
          ? "border-coral bg-coral text-ink"
          : "border-ink-700 text-bone-dim hover:border-bone-faint hover:text-bone"
      }`}
    >
      {label}
    </button>
  );
}
