"use client";

import { Bookmark } from "lucide-react";
import { useCollection } from "@/lib/useCollection";

export default function SaveButton({
  id,
  withLabel = false,
  className = "",
}: {
  id: string;
  withLabel?: boolean;
  className?: string;
}) {
  const { has, toggle, ready } = useCollection();
  const saved = ready && has(id);

  function onClick() {
    toggle(id);
    try {
      if (
        "vibrate" in navigator &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        navigator.vibrate(10);
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save prompt"}
      title={saved ? "Saved" : "Save"}
      className={`inline-flex items-center gap-1.5 rounded-full border text-sm transition-all active:scale-95 ${
        withLabel ? "px-3 py-2" : "h-9 w-9 justify-center"
      } ${
        saved
          ? "border-coral/50 bg-coral/15 text-coral"
          : "border-ink-600 bg-ink/60 text-bone-dim backdrop-blur hover:border-bone-faint hover:text-bone"
      } ${className}`}
    >
      <Bookmark size={16} fill={saved ? "currentColor" : "none"} aria-hidden />
      {withLabel && (saved ? "Saved" : "Save")}
    </button>
  );
}
