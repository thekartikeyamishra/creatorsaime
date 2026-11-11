"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ADS_ENABLED, AD_SLOTS, ADSENSE_CLIENT, isAdEligiblePath, type AdPlacement } from "@/lib/ads";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Loads the AdSense library once, only on ad-eligible pages, after the page is interactive and idle
 * (`lazyOnload`) so it never competes with content for LCP/INP.
 */
export function AdSenseScript() {
  const pathname = usePathname() ?? "/";
  if (!ADS_ENABLED || !isAdEligiblePath(pathname)) return null;
  return (
    <Script
      id="adsense"
      strategy="lazyOnload"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
    />
  );
}

const SHAPES: Record<AdPlacement, { format: string; layout?: string; minH: string }> = {
  tool: { format: "auto", minH: "min-h-[280px]" },
  article: { format: "fluid", layout: "in-article", minH: "min-h-[250px]" },
  multiplex: { format: "autorelaxed", minH: "min-h-[320px]" },
};

/**
 * A single, clearly labelled ad unit.
 *  - Reserves its height up-front (no layout shift).
 *  - Requests the ad only when it is about to scroll into view (no wasted impressions, faster pages).
 *  - Collapses quietly if AdSense has nothing to show, and renders nothing at all if the unit ID is not configured.
 */
export function AdSlot({ placement, className }: { placement: AdPlacement; className?: string }) {
  const pathname = usePathname() ?? "/";
  const slot = AD_SLOTS[placement];
  const ref = useRef<HTMLModElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "requested" | "unfilled">("idle");
  const active = ADS_ENABLED && Boolean(slot) && isAdEligiblePath(pathname);

  useEffect(() => {
    if (!active || !box.current) return;
    const el = box.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          setState("requested");
        } catch {
          setState("unfilled");
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    // AdSense marks units it could not fill; collapse them so readers never see an empty box.
    const mo = new MutationObserver(() => {
      if (ref.current?.getAttribute("data-ad-status") === "unfilled") setState("unfilled");
    });
    if (ref.current) mo.observe(ref.current, { attributes: true, attributeFilter: ["data-ad-status"] });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [active]);

  if (!active || state === "unfilled") return null;
  const s = SHAPES[placement];
  return (
    <aside aria-label="Advertisement" className={`not-prose my-10 ${className ?? ""}`}>
      <p className="mb-1.5 text-center text-[11px] font-medium uppercase tracking-wider text-slate-400">Advertisement</p>
      <div ref={box} className={`overflow-hidden rounded-2xl bg-slate-50 ${s.minH}`}>
        <ins
          ref={ref}
          className="adsbygoogle block"
          style={{ display: "block", textAlign: placement === "article" ? "center" : undefined }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format={s.format}
          {...(s.layout ? { "data-ad-layout": s.layout } : {})}
          {...(placement === "tool" ? { "data-full-width-responsive": "true" } : {})}
        />
      </div>
    </aside>
  );
}
