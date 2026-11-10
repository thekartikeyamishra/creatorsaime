"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Copies instantly. No ad gate, no delay — that keeps us AdSense-compliant.
export default function CopyButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older / insecure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    // Subtle haptic confirmation on supported devices (Android/Chrome).
    try {
      if (
        typeof navigator !== "undefined" &&
        "vibrate" in navigator &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        navigator.vibrate(12);
      }
    } catch {
      /* vibrate unsupported — ignore */
    }
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy prompt to clipboard"
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
        copied
          ? "bg-sage/20 text-sage"
          : "bg-coral text-ink hover:bg-coral-soft active:scale-95"
      } ${className}`}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "Copied" : "Copy prompt"}
    </button>
  );
}
