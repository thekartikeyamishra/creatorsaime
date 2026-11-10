"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

/**
 * Share the current prompt. Uses the native Web Share sheet on supported
 * devices (mobile), otherwise copies the link to the clipboard. Haptic on action.
 */
export default function ShareButton({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  function buzz() {
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

  async function onShare() {
    buzz();
    const shareData = { title: `${title} — CreatorsAI`, url };
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to copy
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — nothing else to do */
    }
  }

  return (
    <button
      onClick={onShare}
      aria-label="Share this prompt"
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-ink-600 bg-ink/60 px-3 text-sm text-bone-dim transition-all active:scale-95 hover:border-bone-faint hover:text-bone"
    >
      {copied ? (
        <>
          <Check size={15} aria-hidden /> Link copied
        </>
      ) : (
        <>
          <Share2 size={15} aria-hidden /> Share
        </>
      )}
    </button>
  );
}
