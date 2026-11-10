"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { site } from "@/lib/site";
import { slotFor, adsEnabled, AD_FREE_PATHS, type AdPlacement } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * A single, layout-shift-safe display ad slot.
 *
 * AdSense policy notes baked into this component:
 *  - Ads sit *next to* content. Nothing here is gated behind viewing/clicking an ad.
 *  - Height is reserved up front (minHeight) so the ad never causes layout shift.
 *  - No ads render on pages without publisher content (offline, 404, saved).
 *  - Each <ins> is pushed to adsbygoogle exactly once. Pushing twice for the same
 *    element yields "All 'ins' elements in the DOM with class=adsbygoogle already
 *    have ads in them" and the slot stays blank -- which is how a live site can
 *    quietly earn nothing.
 */
export default function AdUnit({
  placement,
  slot: slotOverride,
  format = "auto",
  minHeight = 280,
  label = true,
  className = "",
}: {
  /** Named placement; resolves to a slot id from env. Preferred. */
  placement?: AdPlacement;
  /** Escape hatch for a literal slot id. */
  slot?: string;
  format?: string;
  minHeight?: number;
  label?: boolean;
  className?: string;
}) {
  const insRef = useRef<HTMLModElement | null>(null);
  const pathname = usePathname() || "/";

  const resolved = slotOverride ?? (placement ? slotFor(placement) : undefined);
  const onAdFreePath = AD_FREE_PATHS.some((p) => pathname.startsWith(p));
  const active = adsEnabled && Boolean(resolved) && !onAdFreePath;

  useEffect(() => {
    if (!active) return;
    const el = insRef.current;
    if (!el) return;
    // AdSense stamps data-adsbygoogle-status once it has claimed an element.
    if (el.getAttribute("data-adsbygoogle-status")) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Script blocked / offline / not yet loaded. The queue array exists
      // either way, so a later script load drains it. Nothing to do.
    }
  }, [active, resolved]);

  if (!active) {
    // Production: render nothing, so no empty box leaks to real users.
    if (process.env.NODE_ENV === "production") return null;
    // Development: show the placement so it is visible while building.
    return (
      <div
        className={`my-8 flex w-full items-center justify-center rounded-xl border border-dashed border-ink-600/60 bg-ink-800/40 px-3 text-center text-xs text-bone-faint ${className}`}
        style={{ minHeight }}
        aria-hidden="true"
      >
        Ad placement {placement ?? "(unnamed)"} &mdash;{" "}
        {onAdFreePath
          ? "suppressed on this page by policy"
          : "set its NEXT_PUBLIC_ADSENSE_SLOT_* env var to activate"}
      </div>
    );
  }

  return (
    <div
      className={`my-8 w-full overflow-hidden rounded-xl border border-ink-600/60 bg-ink-800/40 ${className}`}
      style={{ minHeight }}
    >
      {label && (
        <div className="px-3 pt-2 text-[11px] uppercase tracking-[0.2em] text-bone-faint">
          Advertisement
        </div>
      )}
      <ins
        key={`${resolved}-${pathname}`}
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", minHeight: minHeight - 20 }}
        data-ad-client={site.adsensePublisherId}
        data-ad-slot={resolved}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
