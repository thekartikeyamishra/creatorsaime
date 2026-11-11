"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TOOLS } from "@/lib/tools-catalog";
import { readRecent } from "./kit";

/** “Continue where you left off” — brings returning visitors straight back to unfinished work. */
export function RecentTools() {
  const [recent, setRecent] = useState<Array<{ slug: string; at: number }>>([]);
  useEffect(() => setRecent(readRecent().filter((r) => TOOLS.some((t) => t.slug === r.slug)).slice(0, 3)), []);
  if (!recent.length) return null;
  const ago = (at: number) => {
    const d = Math.floor((Date.now() - at) / 86_400_000);
    return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
  };
  return (
    <div className="mb-8 rounded-2xl bg-blue-50/70 p-4 ring-1 ring-blue-100">
      <p className="text-sm font-semibold text-ink">Continue where you left off</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {recent.map((r) => {
          const t = TOOLS.find((x) => x.slug === r.slug)!;
          return (
            <Link key={r.slug} href={`/tools/${t.slug}`} className="rounded-full bg-white px-3.5 py-1.5 text-sm ring-1 ring-blue-200 hover:ring-brand">
              {t.name.replace(/ \(.*\)$/, "")} <span className="text-muted">· {ago(r.at)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
