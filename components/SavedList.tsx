"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useCollection } from "@/lib/useCollection";
import { getPrompt, type Prompt } from "@/lib/prompts";
import PromptCard from "@/components/PromptCard";

export default function SavedList() {
  const { ids, ready, prune } = useCollection();

  // Ids can go stale if a prompt is renamed or retired between visits.
  const saved: Prompt[] = ids
    .map((id) => getPrompt(id))
    .filter((p): p is Prompt => Boolean(p));

  const staleCount = ids.length - saved.length;

  if (!ready) {
    return (
      <p className="mt-10 text-bone-faint" role="status">
        Loading your saved prompts…
      </p>
    );
  }

  if (saved.length === 0) {
    return (
      <div className="mt-12 rounded-3xl border border-dashed border-ink-600 p-12 text-center">
        <Bookmark className="mx-auto text-bone-faint" size={28} aria-hidden />
        <h2 className="mt-4 font-display text-2xl text-bone">No saved prompts yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-bone-dim">
          Tap the bookmark on any prompt to keep it here for later. Your
          collection stays on this device.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-coral px-6 py-3 font-medium text-ink transition-colors hover:bg-coral-soft"
        >
          Browse the gallery
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mt-2 text-sm text-bone-faint">
        {saved.length} saved · stored on this device
      </p>
      {staleCount > 0 && (
        <p className="mt-2 text-sm text-bone-faint">
          {staleCount} saved {staleCount === 1 ? "prompt is" : "prompts are"} no
          longer available.{" "}
          <button
            type="button"
            onClick={() => prune((id) => Boolean(getPrompt(id)))}
            className="text-coral underline underline-offset-2 hover:no-underline"
          >
            Remove {staleCount === 1 ? "it" : "them"}
          </button>
        </p>
      )}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {saved.map((p) => (
          <PromptCard key={p.id} prompt={p} />
        ))}
      </div>
    </>
  );
}
